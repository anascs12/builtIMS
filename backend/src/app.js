require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const express     = require('express');
const http        = require('http');
const { Server }  = require('socket.io');
const helmet      = require('helmet');
const compression = require('compression');
const cors        = require('cors');
const morgan      = require('morgan');
const cookieParser = require('cookie-parser');

const logger          = require('./utils/logger');
const { pool }        = require('./config/database');
const { redis }       = require('./config/redis');
const { globalLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ── Route modules ─────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
// Future routes (uncomment as you build them):
const userRoutes = require('./routes/user.routes');
const projectRoutes = require('./routes/project.routes');
const voteRoutes = require('./routes/vote.routes');
const feedRoutes = require('./routes/feed.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const challengeRoutes = require('./routes/challenge.routes');
const digestRoutes = require('./routes/digest.routes');
const uploadRoutes = require('./routes/upload.routes');
const adminRoutes = require('./routes/admin.routes');
const radarRoutes = require('./routes/radar.routes');
const ideaRoutes  = require('./routes/idea.routes');
const showdownRoutes = require('./routes/showdown.routes');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Make io accessible inside route handlers if needed
app.set('io', io);

// ── Security headers ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https://*.amazonaws.com'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ───────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://buildims.imsciences.edu.pk',
  'https://citable-easiest-spoon.ngrok-free.dev',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin (mobile apps, Postman in dev)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials:      true,
  allowedHeaders:   ['Content-Type', 'Authorization'],
  methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(compression());

// ── Request logging ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ── Global rate limit ─────────────────────────────────────────
app.use(globalLimiter);

// ── Health check (no auth, no rate limit) ─────────────────────
app.get('/health', async (req, res) => {
  const checks = {};

  // DB ping
  try {
    await pool.query('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // Redis ping
  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');
  res.status(healthy ? 200 : 503).json({
    status:    healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// ── API routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:id/vote', voteRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/radar', radarRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/showdowns', showdownRoutes);
// Serve uploaded files statically
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, require('express').static(require('path').join(__dirname, '../uploads')));
// ── 404 and error handling ────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Socket.io connection handler ─────────────────────────────
io.on('connection', (socket) => {
  logger.debug('Socket.io client connected', { socketId: socket.id });

  socket.on('join:feed', () => {
    socket.join('feed:public');
    logger.debug('Client joined public feed', { socketId: socket.id });
  });

  socket.on('disconnect', () => {
    logger.debug('Socket.io client disconnected', { socketId: socket.id });
  });
});
const { startStreakResetJob, startIdeaExpiryJob, startShowdownJob, startMLChallengeJob } = require('./jobs/streak.job');
startStreakResetJob();
startIdeaExpiryJob();
startShowdownJob();
startMLChallengeJob();
const { startDigestJob } = require('./jobs/digest.job');
startDigestJob();
const { startScraperJob } = require('./jobs/scraper.job');
startScraperJob();
// ── Boot ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  logger.info(`BuildIMS API running on port ${PORT}`, {
    env:  process.env.NODE_ENV,
    port: PORT,
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await pool.end();
    redis.disconnect();
    logger.info('Server closed.');
    process.exit(0);
  });
  setTimeout(() => { logger.error('Shutdown timeout. Forcing exit.'); process.exit(1); }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

module.exports = { app, server, io };
