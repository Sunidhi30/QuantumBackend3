const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  investment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  payoutDate: {
    type: Date,
    default: Date.now
  },
  payoutType: {
    type: String,
    enum: ['dividend', 'interest', 'principal', 'advance'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  },
  transactionDetails: {
    method: {
      type: String,
      enum: ['bank_transfer', 'wallet', 'crypto'],
      default: 'bank_transfer'
    },
    transactionId: String,
    remarks: String
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

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;