// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming your user model is in this path

const auth = async (req, res, next) => {
  try {
    // Get token from the header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication credentials' });
    }
    
    // Check if user's KYC is verified if needed
    // if (req.originalUrl.includes('/api/investment') && !user.kycInfo.isVerified) {
    //   return res.status(403).json({ message: 'KYC verification required for this operation' });
    // }
    
    // Record login history if this is an initial authentication
    if (req.originalUrl.includes('/api/auth/login')) {
      user.loginHistory.push({
        timestamp: new Date(),
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent'],
        location: req.body.location || 'Unknown'
      });
      user.lastActive = new Date();
      await user.save();
    }
    
    // Add user to request object
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = auth;