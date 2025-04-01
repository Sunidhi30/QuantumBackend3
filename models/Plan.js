const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Quantum_Wealth_Fund', 'Quantum_Globe_Fund', 'Quantum_Blockchain-AI_Fund'],
    required: true
  },
  category: {
    type: String,
    enum: ['low_risk', 'tax_saving', 'AI_funds', 'high_yield', 'blockchain_funds','SIP'],
    required: true
  },
  description: {
  
    type: String,
    required: true
  },
  reasonToInvest: {
    type: String,
    required: false // Optional field
  },
  principal: {
    type: Number,
    required: false // Optional field for principal amount
  },
  keyStrength: {
    type: String,
    required: false
  },
  aboutIssuer: {
    type: String,
    required: false // Issuer details and plans
  },
  Addcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false
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
  planImages: {
    type: String, // Store the image URL
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
    default: ['advance']
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
