const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.json to capture response time
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Log slow requests (over 1 second)
    if (responseTime > 1000) {
      console.warn(`🐌 Slow API: ${req.method} ${req.originalUrl} - ${responseTime}ms`);
    }
    
    // Add response time header
    res.set('X-Response-Time', `${responseTime}ms`);
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = { performanceMonitor };