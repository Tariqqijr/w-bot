const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

// Rate limiter configuration
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => {
    // Use IP address and user agent for rate limiting
    return `${req.ip}_${req.get('User-Agent')}`;
  },
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 60, // Per 60 seconds
});

// More restrictive rate limiter for expensive operations
const strictRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 10, // 10 requests
  duration: 60, // Per 60 seconds
});

// Image generation rate limiter (per user phone number)
const imageRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => {
    // Extract phone from request body or IP as fallback
    const phone = req.body?.phone || req.ip;
    return `image_${phone}`;
  },
  points: parseInt(process.env.MAX_IMAGE_REQUESTS_PER_DAY) || 50,
  duration: 24 * 60 * 60, // Per day
});

// Message rate limiter (per phone number)
const messageRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => {
    // Extract phone from webhook data
    const phone = req.body?.contact?.phone || 
                  req.body?.from || 
                  req.body?.phone || 
                  req.ip;
    return `msg_${phone}`;
  },
  points: parseInt(process.env.MAX_MESSAGES_PER_MINUTE) || 10,
  duration: 60, // Per minute
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const remainingMilliseconds = Math.round(rejRes.msBeforeNext) || 1000;
    
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      remainingTime: remainingMilliseconds
    });
    
    res.set('Retry-After', Math.round(remainingMilliseconds / 1000) || 1);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later.',
      retryAfter: Math.round(remainingMilliseconds / 1000)
    });
  }
};

const strictRateLimiterMiddleware = async (req, res, next) => {
  try {
    await strictRateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const remainingMilliseconds = Math.round(rejRes.msBeforeNext) || 1000;
    
    logger.warn(`Strict rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      endpoint: req.path,
      remainingTime: remainingMilliseconds
    });
    
    res.set('Retry-After', Math.round(remainingMilliseconds / 1000) || 1);
    res.status(429).json({
      status: 'error',
      message: 'Rate limit exceeded for this operation.',
      retryAfter: Math.round(remainingMilliseconds / 1000)
    });
  }
};

const imageRateLimiterMiddleware = async (req, res, next) => {
  try {
    const phone = req.body?.phone || req.ip;
    await imageRateLimiter.consume(`image_${phone}`);
    next();
  } catch (rejRes) {
    const remainingMilliseconds = Math.round(rejRes.msBeforeNext) || 1000;
    
    logger.warn(`Image generation rate limit exceeded`, {
      phone: req.body?.phone,
      ip: req.ip,
      remainingTime: remainingMilliseconds
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Daily image generation limit reached. Try again tomorrow.',
      retryAfter: Math.round(remainingMilliseconds / 1000)
    });
  }
};

const messageRateLimiterMiddleware = async (req, res, next) => {
  try {
    const phone = req.body?.contact?.phone || 
                  req.body?.from || 
                  req.body?.phone || 
                  req.ip;
    await messageRateLimiter.consume(`msg_${phone}`);
    next();
  } catch (rejRes) {
    const remainingMilliseconds = Math.round(rejRes.msBeforeNext) || 1000;
    
    logger.warn(`Message rate limit exceeded`, {
      phone: req.body?.contact?.phone || req.body?.from,
      ip: req.ip,
      remainingTime: remainingMilliseconds
    });
    
    // For webhook endpoints, we should still return 200 to avoid retries
    // but log the rate limiting
    if (req.path.includes('webhook')) {
      res.status(200).json({ status: 'rate_limited' });
    } else {
      res.status(429).json({
        status: 'error',
        message: 'Too many messages, please slow down.',
        retryAfter: Math.round(remainingMilliseconds / 1000)
      });
    }
  }
};

// Middleware to check user-specific limits
const checkUserLimits = async (phone, operation) => {
  try {
    switch (operation) {
      case 'image':
        await imageRateLimiter.consume(`image_${phone}`);
        break;
      case 'message':
        await messageRateLimiter.consume(`msg_${phone}`);
        break;
      default:
        return true;
    }
    return true;
  } catch (rejRes) {
    const remainingTime = Math.round(rejRes.msBeforeNext / 1000) || 60;
    throw new Error(`Rate limit exceeded. Try again in ${remainingTime} seconds.`);
  }
};

// Get remaining points for a user
const getRemainingPoints = async (phone, operation) => {
  try {
    let limiter;
    let key;
    
    switch (operation) {
      case 'image':
        limiter = imageRateLimiter;
        key = `image_${phone}`;
        break;
      case 'message':
        limiter = messageRateLimiter;
        key = `msg_${phone}`;
        break;
      default:
        return null;
    }
    
    const resRateLimiter = await limiter.get(key);
    
    if (resRateLimiter) {
      return {
        remaining: resRateLimiter.remainingHits,
        total: limiter.points,
        resetTime: new Date(Date.now() + resRateLimiter.msBeforeNext)
      };
    } else {
      return {
        remaining: limiter.points,
        total: limiter.points,
        resetTime: new Date(Date.now() + limiter.duration * 1000)
      };
    }
  } catch (error) {
    logger.error('Error getting remaining points:', error);
    return null;
  }
};

module.exports = {
  rateLimiter: rateLimiterMiddleware,
  strictRateLimiter: strictRateLimiterMiddleware,
  imageRateLimiter: imageRateLimiterMiddleware,
  messageRateLimiter: messageRateLimiterMiddleware,
  checkUserLimits,
  getRemainingPoints
};