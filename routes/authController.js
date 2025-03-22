// const User = require('../models/User');
// const { saveOTP, verifyOTP } = require('../services/otpService');
// const jwt = require('jsonwebtoken');
// const config = require('../config/config');

// // Send OTP for registration
// exports.sendRegistrationOTP = async (req, res) => {
//   try {
//     const { mobileNumber, email } = req.body;
    
//     if (!mobileNumber) {
//       return res.status(400).json({ success: false, message: 'Mobile number is required' });
//     }
    
//     // Check if user already exists
//     const existingUser = await User.findOne({ mobileNumber });
//     if (existingUser) {
//       return res.status(400).json({ success: false, message: 'User already exists with this mobile number' });
//     }
    
//     // Generate and save OTP
//     const otp = await saveOTP(mobileNumber, email, 'registration');
    
//     // In production, use SMS gateway to send OTP
//     // For development, just return the OTP in response
//     return res.status(200).json({ 
//       success: true, 
//       message: 'OTP sent successfully',
//       otp: process.env.NODE_ENV === 'development' ? otp : undefined 
//     });
//   } catch (error) {
//     console.error('Error sending registration OTP:', error);
//     return res.status(500).json({ success: false, message: 'Error sending OTP' });
//   }
// };

// // Register new user
// exports.register = async (req, res) => {
//   try {
//     const { username, mobileNumber, email, password, otp } = req.body;
    
//     if (!username || !mobileNumber || !email || !password || !otp) {
//       return res.status(400).json({ success: false, message: 'All fields are required' });
//     }
    
//     // Verify OTP
//     const isOTPValid = await verifyOTP(mobileNumber, otp, 'registration');
//     if (!isOTPValid) {
//       return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
//     }
    
//     // Check referral code if provided
//     let referredBy = null;
//     if (req.body.referralCode) {
//       const referrer = await User.findOne({ referralCode: req.body.referralCode });
//       if (referrer) {
//         referredBy = referrer._id;
//       }
//     }
    
//     // Create new user
//     const newUser = new User({
//       username,
//       mobileNumber,
//       email,
//       password,
//       referredBy
//     });
    
//     await newUser.save();
    
//     // Generate JWT token
//     const token = jwt.sign(
//       { userId: newUser._id, role: newUser.role },
//       config.jwtSecret,
//       { expiresIn: '7d' }
//     );
    
//     return res.status(201).json({
//       success: true,
//       message: 'User registered successfully',
//       token,
//       user: {
//         id: newUser._id,
//         username: newUser.username,
//         mobileNumber: newUser.mobileNumber,
//         email: newUser.email,
//         referralCode: newUser.referralCode
//       }
//     });
//   } catch (error) {
//     console.error('Error registering user:', error);
//     return res.status(500).json({ success: false, message: 'Error registering user' });
//   }
// };

// // Send OTP for login
// exports.sendLoginOTP = async (req, res) => {
//   try {
//     const { mobileNumber } = req.body;
    
//     if (!mobileNumber) {
//       return res.status(400).json({ success: false, message: 'Mobile number is required' });
//     }
    
//     // Check if user exists
//     const user = await User.findOne({ mobileNumber });
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }
    
//     // Generate and save OTP
//     const otp = await saveOTP(mobileNumber, user.email, 'login');
    
//     // In production, use SMS gateway to send OTP
//     return res.status(200).json({ 
//       success: true, 
//       message: 'OTP sent successfully',
//       otp: process.env.NODE_ENV === 'development' ? otp : undefined 
//     });
//   } catch (error) {
//     console.error('Error sending login OTP:', error);
//     return res.status(500).json({ success: false, message: 'Error sending OTP' });
//   }
// };

// // Login with OTP
// exports.loginWithOTP = async (req, res) => {
//   try {
//     const { mobileNumber, otp } = req.body;
    
//     if (!mobileNumber || !otp) {
//       return res.status(400).json({ success: false, message: 'Mobile number and OTP are required' });
//     }
    
//     // Verify OTP
//     const isOTPValid = await verifyOTP(mobileNumber, otp, 'login');
//     if (!isOTPValid) {
//       return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
//     }
    
//     // Find user
//     const user = await User.findOne({ mobileNumber });
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }
    
//     // Check if user is blocked
//     if (user.isBlocked) {
//       return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
//     }
    
//     // Update last login
//     user.lastLogin = Date.now();
//     await user.save();
    
//     // Generate JWT token
//     const token = jwt.sign(
//       { userId: user._id, role: user.role },
//       config.jwtSecret,
//       { expiresIn: '7d' }
//     );
    
//     return res.status(200).json({
//       success: true,
//       message: 'Login successful',
//       token,
//       user: {
//         id: user._id,
//         username: user.username,
//         mobileNumber: user.mobileNumber,
//         email: user.email,
//         role: user.role,
//         referralCode: user.referralCode
//       }
//     });
//   } catch (error) {
//     console.error('Error logging in:', error);
//     return res.status(500).json({ success: false, message: 'Error logging in' });
//   }
// };

const User = require('../models/User');
const { saveOTP, verifyOTP } = require('../services/otpService');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Send OTP for registration
exports.sendRegistrationOTP = async (req, res) => {
  try {
    const { mobileNumber, email } = req.body;
    
    if (!mobileNumber) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ mobileNumber });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this mobile number' });
    }
    
    // Generate and save OTP
    const otp = await saveOTP(mobileNumber, email, 'registration');
    
    // In production, use SMS gateway to send OTP
    // For development, just return the OTP in response
    return res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined 
    });
  } catch (error) {
    console.error('Error sending registration OTP:', error);
    return res.status(500).json({ success: false, message: 'Error sending OTP' });
  }
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, mobileNumber, email, otp } = req.body;
    
    if (!username || !mobileNumber || !email  || !otp) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    // Verify OTP
    const isOTPValid = await verifyOTP(mobileNumber, otp, 'registration');
    if (!isOTPValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    
    // Check referral code if provided
    let referredBy = null;
    if (req.body.referralCode) {
      const referrer = await User.findOne({ referralCode: req.body.referralCode });
      if (referrer) {
        referredBy = referrer._id;
      }
    }
    
    // Create new user
    const newUser = new User({
      username,
      mobileNumber,
      email,
    });
    
    await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        mobileNumber: newUser.mobileNumber,
        email: newUser.email,
        referralCode: newUser.referralCode
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ success: false, message: 'Error registering user' });
  }
};

// Send OTP for login
exports.sendLoginOTP = async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    
    if (!mobileNumber) {
      return res.status(400).json({ success: false, message: 'Mobile number is required' });
    }
    
    // Check if user exists
    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Generate and save OTP
    const otp = await saveOTP(mobileNumber, user.email, 'login');
    
    // In production, use SMS gateway to send OTP
    return res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined 
    });
  } catch (error) {
    console.error('Error sending login OTP:', error);
    return res.status(500).json({ success: false, message: 'Error sending OTP' });
  }
};

// Login with OTP
exports.loginWithOTP = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    
    if (!mobileNumber || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP are required' });
    }
    
    // Verify OTP
    const isOTPValid = await verifyOTP(mobileNumber, otp, 'login');
    if (!isOTPValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    
    // Find user
    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
    }
    
    // Update last login
    user.lastLogin = Date.now();
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        mobileNumber: user.mobileNumber,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ success: false, message: 'Error logging in' });
  }
};