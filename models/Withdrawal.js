// const mongoose = require('mongoose');

// const withdrawalSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   amount: {
//     type: Number,
//     required: true
//   },
//   paymentMethod: {
//     type: String,
//     enum: ['bank_transfer', 'crypto', 'wallet'],
//     required: true
//   },
//   transactionId: {
//     type: String,
//     default: null
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'processed', 'failed'],
//     default: 'pending'
//   },
//   remarks: {
//     type: String,
//     default: null
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// }, { timestamps: true });

// const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

// module.exports = Withdrawal;
const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  accountNumber: { type: String, required: true },
  upiId: { type: String, required: true },
  bankName: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: { type: String },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
module.exports = WithdrawalRequest;
