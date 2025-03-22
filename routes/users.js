const express = require('express');
const router = express.Router();
const User = require('../models/User');
// const auth = require('../middleware/auth');
// const upload = require('../middleware/fileUpload');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

//thoda thoda wait let me take help of chatgpt 

/**
 * @route   POST /api/users/register
 * @desc    Register a new user
 * @access  Public
 */




router.post('/register', [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('phoneNumber', 'Please include a valid phone number').matches(/^\+?[1-9]\d{9,14}$/),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { firstName, lastName, email, phoneNumber, password } = req.body;
  
    try {
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }
  
      // Generate unique referral code
      const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  
      // Create salt & hash
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
  
      // Create new user
      user = new User({
        firstName,
        lastName,
        email,
        phoneNumber,
        passwordHash,
        salt,
        'rewards.referralCode': referralCode
      });
  
      // If referral code is provided, link accounts
      if (req.body.referralCode) {
        const referrer = await User.findOne({ 'rewards.referralCode': req.body.referralCode });
        if (referrer) {
          user.referrerId = referrer._id;
        }
      }
  
      await user.save();
  
      // Process referral if applicable
      if (user.referrerId) {
        await processReferral(user);
      }
  
      // Create JWT
      const payload = {
        user: {
          id: user.id
        }
      };
  
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: 86400 }, // 24 hours
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });
//   router.post("/login-usernamepassword",(req,res) => {})
    router.post("/login-usernamepassword", [
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password is requitred').exists()
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



  module.exports=router;
  