const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Quantum Wealth Fund', 'Quantum Globe Fund', 'Quantum Blockchain-AI Fund'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  apy: {
    type: Number,
    required: true,
    min: 0,
    max: 40 // As per the PDF (Quantum Wealth Fund: 40% APR)
  },
  tenureOptions: {
    type: [String], // Allows multiple tenure options
    enum: ['3 months', '6 months', '1 year', '5 years', '12 months'],
    required: true
  },
  paymentShield: {
    isAvailable: {
      type: Boolean,
      default: false
    },
    duration: {
      type: [String],
      enum: ['3 months', '6 months', '12 months', '1 year', '5 years']
    }
  },
  minInvestment: {
    type: Number,
    required: true
  },
  maxInvestment: {
    type: Number,
    required: true
  },
  dividend: {
    type: Number, // Quantum Globe Fund: 5%, Quantum Blockchain-AI Fund: 10%
    required: true
  },
  maturityDate: {
    type: Date
  },
  reward: {
    type: String // "As per tenure and amount"
  },
  paymentOptions: {
    type: [String],
    enum: ['monthly', 'quarterly', 'yearly', 'advance'],
    default: ['monthly']
  },
  dealHighlights: {
    apy: Number,
    paymentShield: Boolean,
    minInvestment: Number,
    maturityDate: Date,
    reward: String,
    dividend: Number
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'Moderate', 'High'],
    default: 'Moderate'
  },
  isActive: {
    type: Boolean,
    default: true
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

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;
