const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'referral_commission', 'dividend', 'interest'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  relatedInvestment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment'
  },
  relatedReferral: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral'
  },
  relatedPayout: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payout'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'payment_gateway', 'crypto', 'wallet', 'cms'],
    required: true
  },
  transactionDetails: {
    utrNumber: String,
    transactionId: String,
    paymentGatewayResponse: Object,
    cryptoTransactionHash: String,
    receiptImage: String
  },
  walletEffect: { // This will now be a boolean field
    type: Boolean,
    required: true
  },
  remarks: {
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

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;