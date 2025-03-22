const crypto = require('crypto');
const mongoose = require('mongoose');

// OTP Schema
const otpSchema = new mongoose.Schema({
  mobileNumber: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'password_reset', 'transaction'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Automatically remove expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model('OTP', otpSchema);

// Generate OTP
const generateOTP = (length = 6) => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Save OTP to database
const saveOTP = async (mobileNumber, email, purpose) => {
  // Delete any existing OTPs for this user and purpose
  await OTP.deleteMany({ mobileNumber, purpose });
  
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
  
  const newOTP = new OTP({
    mobileNumber,
    email,
    otp,
    purpose,
    expiresAt
  });
  
  await newOTP.save();
  return otp;
};

// Verify OTP
const verifyOTP = async (mobileNumber, otp, purpose) => {
  const otpRecord = await OTP.findOne({
    mobileNumber,
    otp,
    purpose,
    expiresAt: { $gt: new Date() },
    isVerified: false
  });
  
  if (!otpRecord) {
    return false;
  }
  
  // Mark OTP as verified
  otpRecord.isVerified = true;
  await otpRecord.save();
  
  return true;
};

module.exports = {
  generateOTP,
  saveOTP,
  verifyOTP,
  OTP
};