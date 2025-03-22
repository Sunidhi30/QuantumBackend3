const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  kycDocuments: {
    idProof: String,
    addressProof: String,
    selfie: String
  },
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  referralCode: {
    type: String,
    unique: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  referralEarnings: {
    type: Number,
    default: 0
  },
  totalInvestment: {
    type: Number,
    default: 0
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Check if the model is already registered
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
