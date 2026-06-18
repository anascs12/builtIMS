const Redis = require('ioredis');
const logger = require('../utils/logger');

const redis = new Redis({
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db:       0,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect',      () => logger.info('Redis connected'));
redis.on('error',        (err) => logger.error('Redis error', { error: err.message }));
redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));

const keys = {
  tokenBlacklist: (jti)        => `bl:${jti}`,
  lockout:        (userId)     => `lock:${userId}`,
  loginAttempts:  (email)      => `login_attempts:${email}`,
  rateLimit:      (ip, endpoint) => `rl:${ip}:${endpoint}`,
  streakLB:       ()           => 'lb:streaks',
  votesLB:        (showcaseId) => `lb:votes:${showcaseId}`,
  feedCache:      ()           => 'feed:public',
  feedCacheTTL:   60,
  challengeCount: (challengeId) => `challenge:count:${challengeId}`,
  userOnline:     (userId)     => `online:${userId}`,
};

// safeRedis — identical API to redis but swallows errors when Memurai is down.
// Use this in services where Redis is a cache/optional (not for auth blacklist).
const safeRedis = {
  async get(key)             { try { return await redis.get(key);           } catch { return null; } },
  async set(key, val)        { try { await redis.set(key, val);             } catch {} },
  async setex(key, ttl, val) { try { await redis.setex(key, ttl, val);     } catch {} },
  async del(key)             { try { await redis.del(key);                  } catch {} },
  async exists(key)          { try { return await redis.exists(key);        } catch { return 0;    } },
  async incr(key)            { try { return await redis.incr(key);          } catch { return 0;    } },
  async decr(key)            { try { return await redis.decr(key);          } catch { return 0;    } },
  async expire(key, ttl)     { try { await redis.expire(key, ttl);          } catch {} },
};

module.exports = { redis, safeRedis, keys };