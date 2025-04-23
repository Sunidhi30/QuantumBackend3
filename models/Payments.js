const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  bankName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  proofImage: {
    type: String // Optional: for payment proof upload
  },
  relatedInvestment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment'
  },
  wallet: {
    type: Number,
    default: 0,  // Wallet balance starts at 0
    min: 0
  },
  isCredited: { // This will now be a boolean field
    type: Boolean,
    required: true
  }

}, {
  timestamps: true
});

const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);
module.exports = PaymentRequest;