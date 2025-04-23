
const express = require('express');
const jwt = require('jsonwebtoken');
const User  = require("../models/User");

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
const { trusted } = require('mongoose');
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
  console.log(req.body);
  try {
    const { email, mobileNumber,referralCode } = req.body;

    // Ensure at least one is provided
    if (!email && !mobileNumber) {
      return res.status(200).json({ success: false, error: 'Either email or mobile number is required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(mobileNumber ? [{ mobileNumber }] : [])
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(200).json({ success: false, error: 'Email already registered' });
      }
      if (existingUser.mobileNumber === mobileNumber) {
        return res.status(200).json({ success: false, error: 'Phone number already registered' });
      }
    }

    // Generate OTP (for email or mobile)
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    

    const generateReferralCode = async () => {
      let code;
      let isUnique = false;
      while (!isUnique) {
        code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const existingCode = await User.findOne({ referralCode: code });
        if (!existingCode) isUnique = true;
      }
      return code;
    };
    const newReferralCode = await generateReferralCode();
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return res.status(200).json({ success: false, error: 'Invalid referral code' });
      }
    }
    
    const newUser = new User({
      email: email || undefined,
      mobileNumber: mobileNumber || undefined,
      emailOtp: email ? otp : undefined,
      emailOtpExpiry: email ? otpExpiry : undefined,
      phonePin: mobileNumber ? otp : undefined,
      phonePinExpiry: mobileNumber ? otpExpiry : undefined,
      referralCode: newReferralCode,
      referredBy: referrer ? referrer._id : null
    });
    // await newUser.save();

    const sessionId = generateSessionId();
    sessions.set(sessionId, { user: newUser }); // ✅ Already correct

    console.log(newUser);


    if (referrer) {
      const referralBonus = referrer.totalInvestment * 0.035; // 3.5% of investment
      referrer.referralEarnings += referralBonus;
      referrer.totalEarnings += referralBonus;
      await referrer.save();
    }
    // Send OTP to email if provided
    if (email) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        
        to: email,
        subject: 'Verify your email',
        text: `Your verification code is: ${otp}. It will expire in 10 minutes.`
      });
    }
    


    // Here you would integrate an SMS API to send the OTP to mobileNumber if provided
    if (mobileNumber) {
      console.log(`Send OTP ${otp} to mobile: ${mobileNumber}`);
      // Example: await smsService.sendOTP(mobileNumber, otp);
    }

    res.status(201).json({
      message: 'User created. Please verify your email or phone number.',
      sessionId,
      success: true,
      nextStep: email ? 'email-verification' : 'phone-verification',
      referralCode: newReferralCode
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(200).json({ success: false, error: 'Server error' });
  }
});
router.post('/verify-otp', async (req, res) => {
  try {
    const { otp, sessionId } = req.body;
    
    if (!otp || !sessionId) {
      return res.status(400).json({ success: false, error: 'OTP and session ID required' });
    }
    
    // Validate session
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }
    
    // Get user
    let user = session.user; // ✅ Get user from session

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Check if OTP is correct and not expired
    if (user.emailOtp !== otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });

    }
    
    if (!user.emailOtpExpiry || new Date() > user.emailOtpExpiry) {
      return res.status(400).json({ success: false, error: 'OTP expired' });
    }
    
    // Mark email as verified
    user.isEmailVerified = true;
    
    await user.save();
    
    res.json({ 
      success: true,
      kycStatus: newUser.kycStatus,
      message: 'Email verified successfully. You can now proceed with the next step.',
      nextStep: 'complete-registration' 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});
// User Login - Send OTP
router.post('/user-login', async (req, res) => {
  const { email } = req.body;
  console.log("Searching for user with:", email);

  try {
    let user = await User.findOne({ email });

    if (!user)
      return res.status(200).json({ success: false, msg: 'User not found. Please register first.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    OTPStore.set(user.email, otp);

    // Send OTP to user's email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'User Login OTP Verification',
      text: `Your OTP code is ${otp}. It will expire in 5 minutes.`
    });

    return res.json({ success: true, msg: 'OTP sent to email. Please verify.', email: user.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});
// User OTP Verification
router.post('/verify-user-login-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!OTPStore.has(email) || OTPStore.get(email) !== otp) {
    return res.status(400).json({ success: false, msg: 'Invalid or expired OTP' });
  }

  OTPStore.delete(email);

  try {
    let user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ success: false, msg: 'User not found.' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ success: true, msg: 'Login successful', token, user,kycStatus: user.kycStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: 'Server error' });
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
// new  user  token : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2UzYjIzNTA1OWQzNDExODM0YTRiNDIiLCJpYXQiOjE3NDI5NzU5NzMsImV4cCI6MTc0MzA2MjM3M30.r29tJ3469F1w5RWxAtkso7prHLtMYfL85OKe1FPp5a8