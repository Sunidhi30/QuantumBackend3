const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referred: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  investment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment'
  },
  commissionPercentage: {
    type: Number,
    required: true,
    default: 3.5 // Default 3.5% commission
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'rejected'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  transactionId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Referral = mongoose.model('Referral', referralSchema);

module.exports = Referral;