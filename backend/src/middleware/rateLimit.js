const rateLimit = require('express-rate-limit');
const { redis }  = require('../config/redis');
const ApiError   = require('../utils/ApiError');

class RedisStore {
  constructor(prefix = 'rl:', windowMs) {
    this.prefix   = prefix;
    this.windowMs = windowMs;
  }

  async increment(key) {
    try {
      const redisKey = `${this.prefix}${key}`;
      const ttlSecs  = Math.ceil(this.windowMs / 1000);
      const pipeline = redis.pipeline();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, ttlSecs, 'NX');
      const [[, count]] = await pipeline.exec();
      return { totalHits: count, resetTime: new Date(Date.now() + this.windowMs) };
    } catch {
      // Redis down — let all requests through
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key) { try { await redis.decr(`${this.prefix}${key}`); } catch {} }
  async resetKey(key)  { try { await redis.del(`${this.prefix}${key}`);  } catch {} }
}

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore('rl:global:', 60 * 1000),
  handler: (req, res, next) => {
    next(ApiError.tooMany('Rate limit exceeded. Please slow down.'));
  },
  skip: () => process.env.NODE_ENV === 'test',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore('rl:auth:', 15 * 60 * 1000),
  handler: (req, res, next) => {
    next(ApiError.tooMany('Too many auth attempts. Please wait 15 minutes.'));
  },
});

const aiAdvisorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore('rl:ai:', 60 * 60 * 1000),
  handler: (req, res, next) => {
    next(ApiError.tooMany('AI advisor rate limit reached.'));
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore('rl:upload:', 60 * 60 * 1000),
  handler: (req, res, next) => {
    next(ApiError.tooMany('Upload rate limit reached.'));
  },
});

module.exports = { globalLimiter, authLimiter, aiAdvisorLimiter, uploadLimiter };