
const express = require('express');
const router = express.Router();
const User = require('../models/users');
// const auth = require('../middleware/auth');
// const upload = require('../middleware/fileUpload');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');



router.post("/login-usernamepassword", [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { email, password } = req.body;
  
    try {
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }
  
      // Verify password
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }
  
      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Generate and send 2FA code - this would be implemented separately
        // For example:
        // const twoFactorCode = generateTwoFactorCode();
        // await sendTwoFactorCode(user, twoFactorCode);
        
        return res.status(200).json({ 
          msg: 'Two-factor authentication required',
          userId: user._id,
          requires2FA: true
        });
      }
  
      // Record login history
      user.loginHistory.push({
        timestamp: new Date(),
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent'],
        location: req.body.location || 'Unknown'
      });
      
      // Update last active timestamp
      user.lastActive = new Date();
      await user.save();
  
      // Create JWT payload
      const payload = {
        userId: user._id
      };
  
      // Sign and return JWT
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) throw err;
          res.json({
            token,
            user: {
              id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              profilePicture: user.profilePicture,
              kycVerified: user.kycInfo.isVerified,
              twoFactorEnabled: user.twoFactorEnabled,
              investorTier: user.rewards.investorTier.currentTier
            }
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

module.exports=router