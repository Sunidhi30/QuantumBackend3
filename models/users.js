const mongoose = require("mongoose")
const userSchema = new mongoose.Schema({
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
    // loginHistory: [loginHistorySchema],
    // securityQuestions: [securityQuestionSchema],
    
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
    //   investmentPlans: [investmentPlanSchema],
      assetAllocation: {
        shortTerm: { type: Number, default: 0, min: 0, max: 100 }, // Percentage
        longTerm: { type: Number, default: 0, min: 0, max: 100 }, // Percentage
        highYield: { type: Number, default: 0, min: 0, max: 100 } // Percentage
      },
    //   monthlyGrowth: [monthlyGrowthSchema]
    },
    
    // Wallet
    wallet: {
      balance: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'USD' },
    //   paymentMethods: [paymentMethodSchema],
    //   transactions: [transactionSchema]
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
    //   referredUsers: [referredUserSchema],
    //   dividends: [dividendSchema],
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
    //   notificationHistory: [notificationSchema]
    },
    
    // Support
    support: {
    //   ticketHistory: [supportTicketSchema],
      preferredLanguage: { type: String, default: 'English' },
    //   feedbackHistory: [feedbackSchema]
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
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }, { timestamps: true });

  module.exports = mongoose.model("User", userSchema)