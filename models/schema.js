const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Login History Schema
const loginHistorySchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  deviceInfo: { type: String },
  location: { type: String }
});

// Security Questions Schema
const securityQuestionSchema = new Schema({
  question: { type: String, required: true },
  answerHash: { type: String, required: true }
});

// Investment Plan Schema
const investmentPlanSchema = new Schema({
  planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
  investmentAmount: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  maturityDate: { type: Date, required: true },
  expectedAPR: { type: Number, default: 40, min: 0, max: 100 },
  currentValue: { type: Number, required: true, min: 0 },
  returns: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['active', 'matured', 'withdrawn'], 
    default: 'active' 
  },
  autoRenewal: { type: Boolean, default: false }
});

// Monthly Growth Schema
const monthlyGrowthSchema = new Schema({
  month: { type: String, required: true }, // Format: YYYY-MM
  startValue: { type: Number, required: true, min: 0 },
  endValue: { type: Number, required: true, min: 0 },
  growthPercentage: { type: Number }
});

// Payment Method Schema
const paymentMethodSchema = new Schema({
  type: { 
    type: String, 
    enum: ['bank', 'card', 'crypto', 'upi'], 
    required: true 
  },
  details: {
    accountNumber: { type: String, required: function() { return this.type === 'bank'; } },
    bankName: { type: String, required: function() { return this.type === 'bank'; } },
    holderName: { type: String },
    cardNumber: { type: String, required: function() { return this.type === 'card'; } },
    expiryDate: { type: String, required: function() { return this.type === 'card'; } },
    walletAddress: { type: String, required: function() { return this.type === 'crypto'; } },
    upiId: { type: String, required: function() { return this.type === 'upi'; } },
    isVerified: { type: Boolean, default: false }
  },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

// Transaction Schema
const transactionSchema = new Schema({
  type: { 
    type: String, 
    enum: ['deposit', 'withdrawal', 'dividend', 'referral_reward'], 
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  timestamp: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  paymentMethodId: { type: Schema.Types.ObjectId },
  description: { type: String },
  relatedInvestmentPlanId: { type: Schema.Types.ObjectId, ref: 'InvestmentPlan' }
}, { _id: true });

// Referred User Schema
const referredUserSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  joinDate: { type: Date, default: Date.now },
  investmentAmount: { type: Number, default: 0, min: 0 },
  rewardEarned: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
});

// Dividend Schema
const dividendSchema = new Schema({
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  investmentPlanId: { type: Schema.Types.ObjectId, ref: 'InvestmentPlan' },
  paymentMethodId: { type: Schema.Types.ObjectId }
}, { _id: true });

// Notification Schema
const notificationSchema = new Schema({
  type: { 
    type: String, 
    enum: ['investment', 'transaction', 'market', 'promotional'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  actionLink: { type: String }
}, { _id: true });

// Support Ticket Schema
const supportTicketSchema = new Schema({
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'resolved', 'closed'], 
    default: 'open' 
  },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'SupportAgent' },
  attachments: [{ type: String }] // URLs to attachment files
}, { _id: true });

// Feedback Schema
const feedbackSchema = new Schema({
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String },
  category: { type: String, enum: ['app', 'investment', 'support'], required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

// Main User Schema
const userSchema = new Schema({
  // Personal Information
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  phoneNumber: { 
    type: String, 
    required: true,
    match: [/^\+?[1-9]\d{9,14}$/, 'Please enter a valid phone number']
  },
  dateOfBirth: { type: Date },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    postalCode: { type: String }
  },
  profilePicture: { type: String }, // URL to profile picture
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  
  // KYC Information
  kycInfo: {
    isVerified: { type: Boolean, default: false },
    verificationStatus: { 
      type: String, 
      enum: ['pending', 'in_review', 'verified', 'rejected'], 
      default: 'pending' 
    },
    verificationDate: { type: Date },
    idType: { 
      type: String, 
      enum: ['passport', 'driverLicense', 'nationalId', 'other'] 
    },
    idNumber: { type: String }, // Should be encrypted in actual implementation
    idExpiryDate: { type: Date },
    idDocuments: [{ type: String }], // URLs to documents
    addressProof: { type: String }, // URL to address proof document
    rejectionReason: { type: String }
  },
  
  // Security
  passwordHash: { type: String, required: true },
  salt: { type: String, required: true },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorMethod: { type: String, enum: ['app', 'sms', 'email'] },
  recoveryEmail: { type: String, lowercase: true, trim: true },
  loginHistory: [loginHistorySchema],
  securityQuestions: [securityQuestionSchema],
  
  // Investment Profile
  investmentProfile: {
    riskTolerance: { type: String, enum: ['low', 'moderate', 'high'] },
    investmentGoals: [{ 
      type: String, 
      enum: ['retirement', 'short_term', 'growth', 'income', 'education', 'other'] 
    }],
    experienceLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    preferredInvestmentTypes: [{ 
      type: String, 
      enum: ['crypto', 'stocks', 'bonds', 'mutualFunds', 'realEstate', 'other'] 
    }],
    monthlyIncomeRange: { 
      type: String, 
      enum: ['below_1000', '1000_5000', '5000_10000', 'above_10000'] 
    },
    netWorthRange: { 
      type: String, 
      enum: ['below_10000', '10000_50000', '50000_100000', '100000_500000', 'above_500000'] 
    }
  },
  
  // Portfolio
  portfolio: {
    totalInvested: { type: Number, default: 0, min: 0 },
    currentValue: { type: Number, default: 0, min: 0 },
    totalReturns: { type: Number, default: 0 },
    returnPercentage: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    investmentPlans: [investmentPlanSchema],
    assetAllocation: {
      shortTerm: { type: Number, default: 0, min: 0, max: 100 }, // Percentage
      longTerm: { type: Number, default: 0, min: 0, max: 100 }, // Percentage
      highYield: { type: Number, default: 0, min: 0, max: 100 } // Percentage
    },
    monthlyGrowth: [monthlyGrowthSchema]
  },
  
  // Wallet
  wallet: {
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD' },
    paymentMethods: [paymentMethodSchema],
    transactions: [transactionSchema]
  },
  
  // Rewards
  rewards: {
    totalReferralEarnings: { type: Number, default: 0, min: 0 },
    totalDividends: { type: Number, default: 0, min: 0 },
    referralCode: { 
      type: String, 
      unique: true,
      default: function() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
      }
    },
    referredUsers: [referredUserSchema],
    dividends: [dividendSchema],
    investorTier: {
      currentTier: { 
        type: String, 
        enum: ['standard', 'silver', 'gold', 'platinum', 'diamond'], 
        default: 'standard' 
      },
      tierThreshold: { type: Number, default: 0 },
      nextTier: { type: String, enum: ['standard', 'silver', 'gold', 'platinum', 'diamond'] },
      amountToNextTier: { type: Number, default: 0 },
      tierBenefits: [{ type: String }]
    }
  },
  
  // Notifications
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    marketAlerts: { type: Boolean, default: true },
    investmentAlerts: { type: Boolean, default: true },
    transactionAlerts: { type: Boolean, default: true },
    promotionalAlerts: { type: Boolean, default: false },
    notificationHistory: [notificationSchema]
  },
  
  // Support
  support: {
    ticketHistory: [supportTicketSchema],
    preferredLanguage: { type: String, default: 'English' },
    feedbackHistory: [feedbackSchema]
  },
  
  // App Settings
  appSettings: {
    language: { type: String, default: 'English' },
    currency: { type: String, default: 'USD' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    biometricLoginEnabled: { type: Boolean, default: false },
    notificationSettings: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    chartPreferences: {
      defaultTimeframe: { 
        type: String, 
        enum: ['1d', '1w', '1m', '3m', '6m', '1y', 'all'], 
        default: '1m' 
      },
      showPercentages: { type: Boolean, default: true }
    }
  },
  
  // Referrer information
  referrerId: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ 'rewards.referralCode': 1 }, { unique: true });
userSchema.index({ referrerId: 1 });

// Methods
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

userSchema.methods.calculateInvestmentStats = function() {
  // Logic to recalculate total investment stats
  let totalInvested = 0;
  let currentValue = 0;
  
  this.portfolio.investmentPlans.forEach(plan => {
    totalInvested += plan.investmentAmount;
    currentValue += plan.currentValue;
  });
  
  this.portfolio.totalInvested = totalInvested;
  this.portfolio.currentValue = currentValue;
  this.portfolio.totalReturns = currentValue - totalInvested;
  this.portfolio.returnPercentage = totalInvested > 0 ? 
    ((currentValue - totalInvested) / totalInvested) * 100 : 0;
  this.portfolio.lastUpdated = new Date();
  
  return {
    totalInvested,
    currentValue,
    totalReturns: this.portfolio.totalReturns,
    returnPercentage: this.portfolio.returnPercentage
  };
};

// Create and export the model
const User = mongoose.model('User', userSchema);
module.exports = User;