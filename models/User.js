const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: false,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: false,
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
  emailOtp: {
    type: String
  },
  emailOtpExpiry: {
    type: Date
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  phonePin: {
    type: String
  },
  phonePinExpiry: {
    type: Date
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
  // kycDocuments: {
  //   idProof: String,
  //   addressProof: String,
  //   selfie: String
  // },
  kycDocuments: {
    idProof: String, // Cloudinary URL
    panCard: String, // Cloudinary URL (Only for Indian users)
    addressProof: String, // Cloudinary URL
    // dematAccount: String,// aree bhaii chor dete hai
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },
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
    unique: true,
    sparse:true

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