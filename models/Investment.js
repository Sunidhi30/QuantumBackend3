// const mongoose = require('mongoose');

// const investmentSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   plan: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Plan',
//     required: true
//   },
//   planName: {
//     type: String,
//     required: true
//   },
//   amount: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   apr: {
//     type: Number,
//     required: true
//   },
//   startDate: {
//     type: Date,
//     default: Date.now
//   },
//   endDate: {
//     type: Date,
//     required: true
//   },
//   maturityAmount: {
//     type: Number,
//     required: true
//   },
//   paymentMethod: {
//     type: String,
//     enum: ['bank_transfer', 'payment_gateway', 'crypto', 'cms'],
//     required: true
//   },
//   paymentDetails: {
//     transactionId: String,
//     utrNumber: String,
//     receiptImage: String,
//     cryptoWalletAddress: String,
//     cryptoTransactionHash: String
//   },
//   payoutFrequency: {
//     type: String,
//     enum: ['monthly', 'quarterly', 'yearly', 'advance'],
//     default: 'monthly'
//   },
//   paymentShield: {
//     isApplied: {
//       type: Boolean,
//       default: false
//     },
//     duration: {
//       type: String,
//       enum: ['3 months', '6 months', '1 year', '5 years']
//     }
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'active', 'completed', 'cancelled', 'running'],
//     default: 'pending'
//   },
//   payouts: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Payout'
//   }],
//   totalReturns: {
//     type: Number,
//     default: 0
//   },
//   lastPayoutDate: {
//     type: Date
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// const Investment = mongoose.model('Investment', investmentSchema);

// module.exports = Investment;

const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  apr: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  maturityAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'payment_gateway', 'crypto', 'cms'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    utrNumber: String,
    receiptImage: String,
    cryptoWalletAddress: String,
    cryptoTransactionHash: String
  },
  payoutFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'advance'],
    default: 'monthly'
  },
  paymentShield: {
    isApplied: {
      type: Boolean,
      default: false
    },
    duration: {
      type: String,
      enum: ['90 days', '190 days', '365 days']
    }
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled', 'running'],
    default: 'pending'
  },
  payouts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payout'
  }],
  totalReturns: {
    type: Number,
    default: 0
  },
  lastPayoutDate: {
    type: Date
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

const Investment = mongoose.model('Investment', investmentSchema);
module.exports = Investment;
