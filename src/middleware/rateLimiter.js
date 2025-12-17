const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for expensive operations
const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: {
    error: 'Too many requests, please slow down.'
  }
});

// Dashboard specific rate limiter
const dashboardLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 20, // 20 requests per 30 seconds
  message: {
    error: 'Dashboard requests limited, please wait.'
  }
});

module.exports = {
  apiLimiter,
  strictLimiter,
  dashboardLimiter
};