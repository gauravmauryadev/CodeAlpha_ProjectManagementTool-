const NodeCache = require('node-cache');
// StdTTL is 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate a unique key based on URL and user ID (to prevent sharing private data)
    const userId = req.user ? req.user.id : 'anonymous';
    const key = `__express__${req.originalUrl || req.url}__${userId}`;

    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      // Send cached response
      return res.json(cachedResponse);
    } else {
      // Override res.json to capture the response before sending
      const originalJson = res.json;
      res.json = function (body) {
        // Cache the body
        cache.set(key, body, duration);
        // Call the original res.json
        originalJson.call(this, body);
      };
      next();
    }
  };
};

// Export both the middleware and the cache instance to allow manual invalidation (e.g. after POST/PUT)
module.exports = { cacheMiddleware, cache };
