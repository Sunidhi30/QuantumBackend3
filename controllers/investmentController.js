const Investment = require('../models/Investment');
const Plan = require('../models/Plan');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Referral = require('../models/Referral');
const Payout = require('../models/Payout');

// Get all plans
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true });
    return res.status(200).json({ success: true, plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return res.status(500).json({ success: false, message: 'Error fetching plans' });
  }
};

// Get plan details
exports.getPlanDetails = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await Plan.findById(planId);
    
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    
    return res.status(200).json({ success: true, plan });
  } catch (error) {
    console.error('Error fetching plan details:', error);
    return res.status(500).json({ success: false, message: 'Error fetching plan details' });
  }
};

// Create new investment
exports.createInvestment = async (req, res) => {
  try {
    const { planId, amount, paymentMethod, paymentDetails, payoutFrequency, paymentShield } = req.body;
    const userId = req.user.userId;
    
    // Validate plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Plan not found or inactive' });
    }
    
    // Validate amount
    if (amount < plan.minInvestment || amount > plan.maxInvestment) {
      return res.status(400).json({ 
        success: false, 
        message: `Investment amount must be between ₹${plan.minInvestment} and ₹${plan.maxInvestment}` 
      });
    }
    
    // Calculate maturity amount and date
    const apr = plan.apr;
    const durationDays = plan.durationDays;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    
    let maturityAmount;
    if (payoutFrequency === 'advance') {
      // Advance payout calculation
      maturityAmount = amount; // Principal only at maturity
    } else {
      // Calculate based on APR
      const annualReturn = (amount * apr) / 100;
      const dailyReturn = annualReturn / 365;
      const totalReturn = dailyReturn * durationDays;
      maturityAmount = amount + totalReturn;
    }
    
    // Create new investment
    const newInvestment = new Investment({
      user: userId,
      plan: planId,
      planName: plan.name,
      amount,
      apr,
      startDate,
      endDate,
      maturityAmount,
      paymentMethod,
      paymentDetails,
      payoutFrequency: payoutFrequency || 'monthly',
      status: 'pending',
      paymentShield: {
        isApplied: !!paymentShield,
        duration: paymentShield || null
      }
    });
    
    await newInvestment.save();
    
    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      amount,
      type: 'deposit',
      status: 'pending',
      relatedInvestment: newInvestment._id,
      paymentMethod,
      transactionDetails: paymentDetails,
      remarks: `Investment in ${plan.name} plan`
    });
    
    await transaction.save();
    
    // Update user's total investment
    await User.findByIdAndUpdate(userId, {
      $inc: { totalInvestment: amount }
    });
    
    // Process referral if user was referred
    const user = await User.findById(userId);
    if (user.referredBy) {
      const referralCommission = (amount * plan.referralReward) / 100;
      
      const referral = new Referral({
        referrer: user.referredBy,
        referred: userId,
        investment: newInvestment._id,
        commissionPercentage: plan.referralReward,
        commissionAmount: referralCommission,
        status: 'pending'
      });
      
      await referral.save();
    }
    
    return res.status(201).json({
      success: true,
      message: 'Investment created successfully',
      investment: newInvestment
    });
  } catch (error) {
    console.error('Error creating investment:', error);
    return res.status(500).json({ success: false, message: 'Error creating investment' });
  }
};

// Get user's investments
exports.getUserInvestments = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const investments = await Investment.find({ user: userId })
      .sort({ createdAt: -1 });
    
    // Calculate total portfolio value
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturns = investments.reduce((sum, inv) => sum + (inv.totalReturns || 0), 0);
    const activeInvestments = investments.filter(inv => ['active', 'pending', 'running'].includes(inv.status));
    const activeInvestmentsCount = activeInvestments.length;
    
    return res.status(200).json({
      success: true,
      investments,
      stats: {
        totalInvested,
        totalReturns,
        activeInvestmentsCount
      }
    });
  } catch (error) {
    console.error('Error fetching investments:', error);
    return res.status(500).json({ success: false, message: 'Error fetching investments' });
  }
};

// Get investment details
exports.getInvestmentDetails = async (req, res) => {
  try {
    const { investmentId } = req.params;
    const userId = req.user.userId;
    
    const investment = await Investment.findById(investmentId)
      .populate('plan', 'name type apr features')
      .populate('payouts');
    
    if (!investment || investment.user.toString() !== userId) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }
    
    return res.status(200).json({ success: true, investment });
  } catch (error) {
    console.error('Error fetching investment details:', error);
    return res.status(500).json({ success: false, message: 'Error fetching investment details' });
  }
};

// Get referral earnings
exports.getReferralEarnings = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const referrals = await Referral.find({ referrer: userId })
      .populate('referred', 'username')
      .populate('investment', 'amount planName')
      .sort({ createdAt: -1 });
    
    const totalEarnings = referrals.reduce((sum, ref) => {
      return ref.status === 'paid' ? sum + ref.commissionAmount : sum;
    }, 0);
    
    const pendingEarnings = referrals.reduce((sum, ref) => {
      return ref.status === 'pending' ? sum + ref.commissionAmount : sum;
    }, 0);
    
    return res.status(200).json({
      success: true,
      referrals,
      stats: {
        totalEarnings,
        pendingEarnings,
        referralsCount: referrals.length
      }
    });
  } catch (error) {
    console.error('Error fetching referral earnings:', error);
    return res.status(500).json({ success: false, message: 'Error fetching referral earnings' });
  }
};