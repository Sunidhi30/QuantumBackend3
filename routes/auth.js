
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const { check, validationResult } = require('express-validator');
const sessions = new Map();
const crypto= require("crypto")
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}
env = require('dotenv').config();

const router = express.Router();
const OTPStore = new Map(); // Temporary store for OTPs

// Email transport setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}



router.post('/register', async (req, res) => {
  console.log(req.body)
  try {
    const { username, email, mobileNumber } = req.body;
    
    // Validate input
    if (!username || !email || !mobileNumber) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }, { mobileNumber }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      if (existingUser.username === username) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      if (existingUser.mobileNumber === mobileNumber) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    }
    
    // Generate OTP for email verification
    const emailOtp = generateOTP();
    const emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Create new user
    const newUser = new User({
      username,
      email,
      mobileNumber,
      emailOtp,
      emailOtpExpiry
    });
    
    await newUser.save();
    console.log(newUser)
    
    // Send OTP to email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your email',
      text: `Your verification code is: ${emailOtp}. It will expire in 10 minutes.`
    });
    
    // Create session
    const sessionId = generateSessionId();
    sessions.set(sessionId, { userId: newUser._id });
    
    res.status(201).json({ 
      message: 'User created. Please verify your email.',
      sessionId,
      nextStep: 'email-verification'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/verify-otp', async (req, res) => {
  try {
    const { otp, sessionId } = req.body;
    
    if (!otp || !sessionId) {
      return res.status(400).json({ error: 'OTP and session ID required' });
    }
    
    // Validate session
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Get user
    const user = await User.findById(session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if OTP is correct and not expired
    if (user.emailOtp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    if (!user.emailOtpExpiry || new Date() > user.emailOtpExpiry) {
      return res.status(400).json({ error: 'OTP expired' });
    }
    
    // Mark email as verified
    user.isEmailVerified = true;
    
    await user.save();
    
    res.json({ 
      message: 'Email verified successfully. You can now proceed with the next step.',
      nextStep: 'complete-registration' 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3️⃣ **Login API (Using Email or Mobile Number & OTP)**
router.post('/login', [
  // check('login', 'Email or Mobile Number is required').not().isEmpty()
], async (req, res) => {
  const { login } = req.body;
  console.log("Searching for user with:", login);
  try {
      let user = await User.findOne({
          $or: [{ email: login }, { mobileNumber: login }]
      });

      if (!user) return res.status(400).json({ msg: 'User not found. Please register first.' });

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      OTPStore.set(user.email, otp); // Store OTP temporarily

      // Send OTP to email
      await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'Login OTP Verification',
          text: `Your OTP code is ${otp}. It will expire in 5 minutes.`
      });

      res.json({ msg: 'OTP sent to email. Please verify.' });
  } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
  }
});

// 4️⃣ **Verify OTP & Login**
router.post('/verify-login-otp', [
  check('email', 'Email is required').isEmail(),
  check('otp', 'OTP is required').not().isEmpty()
], async (req, res) => {
  const { email, otp } = req.body;

  if (!OTPStore.has(email) || OTPStore.get(email) !== otp) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
  }

  OTPStore.delete(email); // Remove OTP after verification

  try {
      let user = await User.findOne({ email });
      if (!user) return res.status(400).json({ msg: 'User not found.' });

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

      res.json({ msg: 'Login successful', token, user });
  } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/home', async (req, res) => {
  const token = req.headers['authorization']; // Get token from request headers

  if (!token) {
      return res.status(401).json({ msg: 'Unauthorized. Token is missing.' });
  }

  try {
      const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET); // Verify JWT token
      const user = await User.findById(decoded.userId).select('-password'); // Fetch user details

      if (!user) {
          return res.status(404).json({ msg: 'User not found.' });
      }

      res.json({ msg: 'Welcome to Home Page', user });
  } catch (err) {
      console.error(err);
      return res.status(401).json({ msg: 'Invalid or expired token' });
  }
});
const authenticateAdmin = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
      return res.status(401).json({ msg: 'Unauthorized. Token is missing.' });
  }

  try {
      const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
      if (decoded.role !== 'admin') {
          return res.status(403).json({ msg: 'Access denied. Admins only.' });
      }
      req.admin = decoded;
      next();
  } catch (err) {
      return res.status(401).json({ msg: 'Invalid or expired token' });
  }
};

// Example: Protecting an admin-only route
router.get('/admin/dashboard', authenticateAdmin, (req, res) => {
  res.json({ msg: 'Welcome, Admin!', admin: req.admin });
});

module.exports = router;
