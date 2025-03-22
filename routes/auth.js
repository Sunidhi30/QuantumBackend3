
// const express = require('express');
// const router = express.Router();
// const User = require('../models/users');
// // const auth = require('../middleware/auth');
// // const upload = require('../middleware/fileUpload');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { check, validationResult } = require('express-validator');



// router.post("/login-usernamepassword", [
//     check('email', 'Please include a valid email').isEmail(),
//     check('password', 'Password is required').exists()
//   ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
  
//     const { email, password } = req.body;
  
//     try {
//       // Find user by email
//       const user = await User.findOne({ email });
//       if (!user) {
//         return res.status(400).json({ msg: 'Invalid credentials' });
//       }
  
//       // Verify password
//       const isMatch = await bcrypt.compare(password, user.passwordHash);
//       if (!isMatch) {
//         return res.status(400).json({ msg: 'Invalid credentials' });
//       }
  
//       // Check if 2FA is enabled
//       if (user.twoFactorEnabled) {
//         // Generate and send 2FA code - this would be implemented separately
//         // For example:
//         // const twoFactorCode = generateTwoFactorCode();
//         // await sendTwoFactorCode(user, twoFactorCode);
        
//         return res.status(200).json({ 
//           msg: 'Two-factor authentication required',
//           userId: user._id,
//           requires2FA: true
//         });
//       }
  
//       // Record login history
//       user.loginHistory.push({
//         timestamp: new Date(),
//         ipAddress: req.ip,
//         deviceInfo: req.headers['user-agent'],
//         location: req.body.location || 'Unknown'
//       });
      
//       // Update last active timestamp
//       user.lastActive = new Date();
//       await user.save();
  
//       // Create JWT payload
//       const payload = {
//         userId: user._id
//       };
  
//       // Sign and return JWT
//       jwt.sign(
//         payload,
//         process.env.JWT_SECRET,
//         { expiresIn: '24h' },
//         (err, token) => {
//           if (err) throw err;
//           res.json({
//             token,
//             user: {
//               id: user._id,
//               firstName: user.firstName,
//               lastName: user.lastName,
//               email: user.email,
//               profilePicture: user.profilePicture,
//               kycVerified: user.kycInfo.isVerified,
//               twoFactorEnabled: user.twoFactorEnabled,
//               investorTier: user.rewards.investorTier.currentTier
//             }
//           });
//         }
//       );
//     } catch (err) {
//       console.error(err.message);
//       res.status(500).send('Server error');
//     }
//   });

// module.exports=router
//  before editing 

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const { check, validationResult } = require('express-validator');

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

// 1️⃣ **Register & Send OTP**
router.post('/register', [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Enter a valid email').isEmail(),
    check('mobileNumber', 'Enter a valid phone number').matches(/\+?[1-9]\d{9,14}$/)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, mobileNumber } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        OTPStore.set(email, otp);

        // Send OTP email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otp}. It will expire in 5 minutes.`
        });

        res.json({ msg: 'OTP sent to email. Please verify.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});

// 2️⃣ **Verify OTP & Login**
router.post('/verify-otp', [
    check('email', 'Email is required').isEmail(),
    check('otp', 'OTP is required').not().isEmpty()
], async (req, res) => {
    const { email, otp } = req.body;

    if (!OTPStore.has(email) || OTPStore.get(email) !== otp) {
        return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    OTPStore.delete(email); // Remove OTP after use

    try {
        let user = await User.findOne({ email });

        // If user doesn't exist, create a new user
        if (!user) {
          user = new User({
              username: req.body.username,  // Get username from request
              email,
              mobileNumber: req.body.mobileNumber // Get mobileNumber from request
          });
          await user.save();
      }
      

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({ msg: 'OTP verified successfully', token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server error' });
    }
});
// 3️⃣ **Login API (Using Email or Mobile Number & OTP)**
router.post('/login', [
  check('login', 'Email or Mobile Number is required').not().isEmpty()
], async (req, res) => {
  const { login } = req.body;

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
