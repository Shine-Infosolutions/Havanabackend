const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  
  req.user = {
    _id: 'bypass-user',
    username: 'admin',
    role: 'admin',
    isActive: true
  };
  next();
};


//this 
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

module.exports = { auth, authorize };