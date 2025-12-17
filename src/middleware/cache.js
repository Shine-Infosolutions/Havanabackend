const NodeCache = require('node-cache');

// Create cache instance with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300 });

const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache response
    res.json = function(data) {
      cache.set(key, data, duration);
      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = { cacheMiddleware, cache };