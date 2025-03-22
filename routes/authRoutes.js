const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const User = require('../models/User'); // Ensure the path is correct
require('dotenv').config();

const router = express.Router();

// Twilio Setup
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const otpStore = {}; // Temporary store for OTPs (Use Redis in production)

// Function to send OTP
const sendOTP = async (mobileNumber) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[mobileNumber] = otp;
  
  await client.messages.create({
    body: `Your OTP is ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: mobileNumber
  });

  return otp;
};

// Signup Route
router.post('/signup', async (req, res) => {
  try {
    const { username, mobileNumber, email } = req.body;

    let user = await User.findOne({ mobileNumber });
    if (user) return res.status(400).json({ message: 'User already exists' });

    await sendOTP(mobileNumber);
    res.json({ message: 'OTP sent to mobile number', mobileNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP & Register
router.post('/verify-signup', async (req, res) => {
  try {
    const { username, mobileNumber, email, otp, password } = req.body;

    if (otpStore[mobileNumber] !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    delete otpStore[mobileNumber]; // Clear OTP after use

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, mobileNumber, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'User registered successfully', token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    let user = await User.findOne({ mobileNumber });
    if (!user) return res.status(400).json({ message: 'User not found' });

    await sendOTP(mobileNumber);
    res.json({ message: 'OTP sent for login', mobileNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP & Login
router.post('/verify-login', async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    let user = await User.findOne({ mobileNumber });

    if (!user) return res.status(400).json({ message: 'User not found' });
    if (otpStore[mobileNumber] !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    
    delete otpStore[mobileNumber];
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
