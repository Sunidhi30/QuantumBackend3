const mongoose = require('mongoose');


const investmentTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  investment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Investment",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  method: {
    type: String,
    default: "Wallet Balance"
  },
  type: {
    type: String,
    enum: ["buy", "sell"],  // "buy" for investment, "sell" for withdrawal
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  walletBalanceAfterTransaction: {
    type: Number,
    required: true
  }
});



const InvestmentTransaction = mongoose.model("InvestmentTransaction", investmentTransactionSchema);

module.exports =InvestmentTransaction
