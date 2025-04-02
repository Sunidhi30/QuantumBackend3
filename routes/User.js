const express = require("express");
const router = express.Router();
const Plan = require("../models/Plan"); // Import Plan model
const { protect } = require("../middlewares/authMiddlewares"); // Only authentication required
const User = require("../models/User"); // Ensure correct path
const { uploadToCloudinary } = require("../utils/cloudinary");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const Investment = require("../models/Investment");
const PDFDocument = require('pdfkit');
const FAQ = require("../models/FAQ"); // Import the FAQ model
const { body, validationResult } = require('express-validator');
const Reward = require('../models/Rewards');
const nodemailer = require("nodemailer");
const Quiz = require("../models/Quiz");
const PaymentRequest = require('../models/Payments');
const { v4: uuidv4 } = require('uuid');
const WithdrawalRequest = require('../models/Withdrawal');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email provider
    auth: {
      user: process.env.EMAIL_USER, // Admin email (set in environment variables)
      pass: process.env.EMAIL_PASS // Admin email password (use env variables for security)
    }
  });
  
// update the users profile
router.put('/update-profile', protect, [
  body('username').optional().trim(),
  body('mobileNumber').optional().isMobilePhone(),
  body('email').optional().isEmail().normalizeEmail(),
  body('bankDetails.accountHolderName').optional().trim(),
  body('bankDetails.accountNumber').optional().isNumeric(),
  body('bankDetails.ifscCode').optional().trim(),
  body('bankDetails.bankName').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, mobileNumber, email, bankDetails } = req.body;
    const updateFields = {};

    if (username) updateFields.username = username;
    if (mobileNumber) updateFields.mobileNumber = mobileNumber;
    if (email) updateFields.email = email;
    if (bankDetails) updateFields.bankDetails = bankDetails;

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateFields, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
//All the invested plans 

router.get('/plans', async (req, res) => {
    try {
        let query = {};

        // Apply filters based on request query parameters
        if (req.query.minInvestment) {
            query.minInvestment = { $gte: Number(req.query.minInvestment) };
        }
        if (req.query.maxInvestment) {
            query.maxInvestment = { $lte: Number(req.query.maxInvestment) };
        }
        if (req.query.tenure) {
            query.tenureOptions = req.query.tenure; // Match tenure exactly
        }

        const plans = await Plan.find(query);
        res.json({ success: true, plans });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// users profile update 
router.put('/update-profile', protect, [
    body('username').optional().trim(),
    body('mobileNumber').optional().isMobilePhone(),
    body('email').optional().isEmail().normalizeEmail(),
    body('bankDetails.accountHolderName').optional().trim(),
    body('bankDetails.accountNumber').optional().isNumeric(),
    body('bankDetails.ifscCode').optional().trim(),
    body('bankDetails.bankName').optional().trim(),
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const { username, mobileNumber, email, bankDetails } = req.body;
      const updateFields = {};
  
      if (username) updateFields.username = username;
      if (mobileNumber) updateFields.mobileNumber = mobileNumber;
      if (email) updateFields.email = email;
      if (bankDetails) updateFields.bankDetails = bankDetails;
  
      const updatedUser = await User.findByIdAndUpdate(req.user.id, updateFields, { new: true });
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  //plans by cateogry : high_yeild,sip 
// router.get('/plans/category/:category', async (req, res) => {
//     try {
//         const category = req.params.category.toLowerCase(); // ✅ Convert to lowercase

//         const plans = await Plan.find({ category });

//         if (plans.length === 0) {
//             return res.status(404).json({ success: false, msg: 'No plans found for this category' });
//         }

//         res.json({ success: true, msg: 'Plans retrieved successfully', plans });

//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// });
// router.get('/plans/category/:category', async (req, res) => {
//     try {
//         const category = req.params.category;
//         const plans = await Plan.find({ category: new RegExp(`^${category}$`, 'i') });

//         if (plans.length === 0) {
//             return res.status(404).json({ success: false, msg: 'No plans found for this category' });
//         }

//         res.json({ success: true, msg: 'Plans retrieved successfully', plans });

//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// });
router.get('/plans/category/:category', async (req, res) => {
  try {
      const category = req.params.category;
      const plans = await Plan.find({ category: new RegExp(`^${category}$`, 'i') });

      // Return an empty array if no plans are found
      res.json({ success: true, msg: 'Plans retrieved successfully', plans: plans || [] });

  } catch (error) {
      res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/plans/type/:type', async (req, res) => {
    try {
        const { type } = req.params;

        // Ensure the provided type matches the enum values
        if (!['Quantum_Wealth_Fund', 'Quantum_Globe_Fund', 'Quantum_Blockchain-AI_Fund'].includes(type)) {
            return res.status(400).json({ success: false, msg: 'Invalid plan type' });
        }

        const plans = await Plan.find({ type });

        if (!plans.length) {
            return res.status(404).json({ success: false, msg: 'No plans found for this type' });
        }

        res.json({ success: true, msg: 'Plans retrieved successfully',  plans: plans || []});

    } catch (error) {
        res.status(500).json({ success: false, msg: 'Server error', error: error.message });
    }
});


// Send Referral Code API
router.post('/send-referral', async (req, res) => {
  try {
    const { userEmail, friendEmail } = req.body;

    // Validate request body
    if (!userEmail || !friendEmail) {
      return res.status(400).json({ success: false, error: "User email and friend's email are required" });
    }

    // Find the user in the database
    const existingUser = await User.findOne({ email: userEmail });

    if (!existingUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check if the user has a referral code
    if (!existingUser.referralCode) {
      return res.status(400).json({ success: false, error: "Referral code not found for this user" });
    }

    const referralCode = existingUser.referralCode;

    // Send an email to the friend
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: friendEmail,
      subject: "Referral Invitation",
      text: `Hello! Your friend has invited you to join. Use their referral code: ${referralCode} when signing up.`,
      html: `<p>Hello! Your friend has invited you to join.</p>
             <p><strong>Use their referral code: <span style="color:blue;">${referralCode}</span></strong> when signing up.</p>`
    });

    return res.status(200).json({ success: true, message: "Referral code sent successfully!" });

  } catch (error) {
    console.error("Error sending referral:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});
router.get("/plans/deal-highlights", protect, async (req, res) => {
    try {
        // Fetch only active plans where `dealHighlights` is non-empty
        const plans = await Plan.find(
            { isActive: true, "dealHighlights.apy": { $exists: true } }, 
            { name: 1, type: 1, category: 1, dealHighlights: 1 }
        );

        if (!plans.length) {
            return res.status(404).json({ success: false, message: "No plans with deal highlights found." });
        }

        res.status(200).json({ success: true, plans });
    } catch (error) {
        console.error("Error fetching deal highlights:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// get details of the plan by its id 
router.get('/plans/:id', async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }
        res.status(200).json({ success: true , plan });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// filter for the search query not added in the docs
router.get('/plans/filter', protect, async (req, res) => {
    try {
        let query = {};

        if (req.query.apy) {
            query['dealHighlights.apy'] = Number(req.query.apy);
        }
        if (req.query.tenure) {
            query.tenureOptions = req.query.tenure;
        }
        if (req.query.minInvestment) {
            query['dealHighlights.minInvestment'] = { $gte: Number(req.query.minInvestment) };
        }

        const plans = await Plan.find(query);
        res.status(200).json({ success: true, plans });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post(
  "/kyc",
  protect,
  upload.fields([
    { name: "idProof", maxCount: 1 }, // Aadhaar or Passport
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { nationality, idNumber } = req.body;

      // Ensure nationality and ID number are provided
      if (!nationality || !idNumber) {
        return res.status(400).json({ message: "Nationality and ID number are required" });
      }

      // Validate required document based on nationality
      if (!req.files.idProof) {
        return res.status(400).json({ message: "ID Proof document is required" });
      }

      if (nationality === "Indian") {
        if (!idNumber.match(/^\d{12}$/)) {
          return res.status(400).json({ message: "Aadhaar number must be 12 digits" });
        }
      } else {
        if (!idNumber.match(/^[A-Z0-9]+$/)) {
          return res.status(400).json({ message: "Invalid passport number format" });
        }
      }

      // Upload ID Proof to Cloudinary
      const idProofUrl = await uploadToCloudinary(req.files.idProof[0].buffer, "kyc_docs", req.files.idProof[0].mimetype);

      // Save KYC details in the user model
      user.kycDocuments = {
        idProof: idProofUrl,
        idNumber,
      };
      user.kycStatus = "pending";
      await user.save();

      console.log("Stored KYC Data:", user.kycDocuments);

      res.status(200).json({
        userId: req.user.id,
        success: true,
        message: "KYC submitted successfully. Waiting for admin approval.",
        urls: user.kycDocuments,
      });
    } catch (error) {
      console.error("KYC Upload Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);


router.get('/kyc-documents', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.kycDocuments) {
            return res.status(404).json({ message: "No KYC documents found" });
        }

        res.status(200).json({
            success: true,
            kycDocuments: {
                idProof: user.kycDocuments.idProof || null
              
             
            },
            kycStatus: user.kycStatus
        });

    } catch (error) {
        console.error("Error fetching KYC documents:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// skipped on the postman for now
// router.post("/investments/create", protect, async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const { planId, amount, paymentMethod, paymentDetails } = req.body;

//         // Validate required fields
//         if (!planId || !amount || !paymentMethod) {
//             return res.status(400).json({ success: false, message: "All fields are required" });
//         }

//         // Fetch the investment plan
//         const plan = await Plan.findById(planId);
//         if (!plan || !plan.isActive) {
//             return res.status(404).json({ success: false, message: "Plan not found or inactive" });
//         }

//         // Validate investment amount
//         if (amount < plan.minInvestment || amount > plan.maxInvestment) {
//             return res.status(400).json({ success: false, message: `Investment amount must be between ₹${plan.minInvestment} and ₹${plan.maxInvestment}` });
//         }

//         // Fetch user details
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found" });
//         }

//         // Check if the user has enough wallet balance (Optional - Uncomment if wallet system is implemented)
//         // if (user.walletBalance < amount) {
//         //     return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
//         // }

//         // Calculate maturity date based on tenure
//         const tenureInMonths = parseInt(plan.tenureOptions[plan.tenureOptions.length - 1]); // Get last tenure option
//         const maturityDate = new Date();
//         maturityDate.setMonth(maturityDate.getMonth() + tenureInMonths);

//         // Calculate maturity amount using simple interest formula
//         const maturityAmount = amount + (amount * (plan.apy / 100));

//         // Create new investment record
//         const newInvestment = new Investment({
//             user: userId,
//             plan: planId,
//             planName: plan.name,
//             amount,
//             apr: plan.apy,
//             startDate: new Date(),
//             endDate: maturityDate,
//             maturityAmount,
//             paymentMethod,
//             paymentDetails,
//             payoutFrequency: plan.paymentOptions[0], // Default to first option
//             status: "pending" // Change to "active" after admin approval (if required)
//         });

//         await newInvestment.save();

//         // Deduct from user's wallet (If wallet system is used)
//         // user.walletBalance -= amount;
//         user.totalInvestment += amount;
//         await user.save();

//         res.status(200).json({ success: true, message: "Investment successful!", investment: newInvestment });

//     } catch (error) {
//         console.error("Error in investment:", error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });
// create investment 
// router.post("/investments/create", protect, async (req, res) => {
//   try {
//       const userId = req.user.id;
//       const { planId, units } = req.body;

//       // Validate required fields
//       if (!planId || !units || units <= 0) {
//           return res.status(400).json({ success: false, message: "Plan ID and a valid number of units are required" });
//       }

//       // Fetch the investment plan
//       const plan = await Plan.findById(planId);
//       if (!plan || !plan.isActive) {
//           return res.status(404).json({ success: false, message: "Plan not found or inactive" });
//       }

//       // Calculate investment amount
//       const investmentAmount = units * plan.minInvestment;

//       // Fetch user details
//       const user = await User.findById(userId);
//       if (!user) {
//           return res.status(404).json({ success: false, message: "User not found" });
//       }

//       // Check if user has enough wallet balance
//       if (user.walletBalance < investmentAmount) {
//           return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
//       }

//       // Calculate maturity date based on tenure
//       const tenureInMonths = parseInt(plan.tenureOptions[plan.tenureOptions.length - 1]); // Get last tenure option
//       const maturityDate = new Date();
//       maturityDate.setMonth(maturityDate.getMonth() + tenureInMonths);

//       // Calculate maturity amount using simple interest formula
//       const maturityAmount = investmentAmount + (investmentAmount * (plan.apy / 100));

//       // Create new investment record
//       const newInvestment = new Investment({
//           user: userId,
//           plan: planId,
//           planName: plan.name,
//           amount: investmentAmount,
//           units,
//           apr: plan.apy,
//           startDate: new Date(),
//           endDate: maturityDate,
//           maturityAmount,
//           payoutFrequency: plan.paymentOptions[0], // Default to first option
//           status: "active" // Change to "active" after admin approval (if required)
//       });

//       await newInvestment.save();

//       // Deduct from user's wallet
//       user.walletBalance -= investmentAmount;
//       user.totalInvestment += investmentAmount;
//       await user.save();

//       res.status(200).json({ success: true, message: "Investment successful!", investment: newInvestment });

//   } catch (error) {
//       console.error("Error in investment:", error);
//       res.status(500).json({ success: false, error: error.message });
//   }
// });
//


router.post("/investments/create", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, units } = req.body;

    // Validate required fields
    if (!planId || !units || units <= 0) {
      return res.status(400).json({ success: false, message: "Plan ID and a valid number of units are required" });
    }

    // Fetch the investment plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });
    }

    // Calculate investment amount
    const investmentAmount = units * plan.minInvestment;

    // Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if user has enough wallet balance
    // if (user.walletBalance < investmentAmount) {
    //   return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    // }

    // Calculate maturity date based on tenure
    const tenureInMonths = parseInt(plan.tenureOptions[plan.tenureOptions.length - 1]); // Get last tenure option
    const tenureInYears = tenureInMonths / 12;
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + tenureInMonths);

    // Compound Interest Calculation
    const principal = investmentAmount;
    const rate = plan.apy / 100; // Convert APY to decimal
    const n = 12; // Assuming monthly compounding
    const t = tenureInYears;

    const totalTaxAmount = principal * Math.pow(1 + rate / n, n * t);
    const maturityAmount = investmentAmount + totalTaxAmount + (investmentAmount * (plan.apy / 100));

    // Corrected Total Returns (Profit Only)
    const totalReturns = maturityAmount - investmentAmount;

    // Fetch existing investments and calculate total investments
    const userInvestments = await Investment.find({ user: userId });
const totalInvestments = userInvestments.reduce((sum, inv) => sum + inv.maturityAmount, 0) + parseFloat(maturityAmount);
    console.log("total investments ", totalInvestments);
    const currentInvested = userInvestments.reduce((sum, inv) => sum + inv.amount, 0) + investmentAmount;
    console.log("curent"+currentInvested,)
    // Create new investment record
    const newInvestment = new Investment({
      user: userId,
      plan: planId,
      planName: plan.name,
      amount: investmentAmount,
      TAXAmount : totalTaxAmount,
      units,
      apr: plan.apy,
      startDate: new Date(),
      endDate: maturityDate,
      totalReturns : totalReturns,
      totalInvestments,
      maturityAmount: maturityAmount.toFixed(2), // Round off for better readability
      payoutFrequency: plan.paymentOptions[0], // Default to first option
      status: "active" // Change to "active" after admin approval (if required)
    });

    await newInvestment.save();

    // Deduct from user's wallet
    user.walletBalance -= investmentAmount;
    user.totalInvestment += investmentAmount;
    await user.save();

    res.status(200).json({ 
      success: true, 
      // message: "Investment successful!", 
      // totalInvestments,
      // currentInvested: investmentAmount,
      // totalReturns,
      // investment: newInvestment
      newInvestment
    });

  } catch (error) {
    console.error("Error in investment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


router.get("/investments/:userId", protect, async (req, res) => {
    try {
        const userId = req.params.userId;

        // Find investments made by the user
        const investments = await Investment.find({ user: userId }).populate("plan");

        if (!investments.length) {
            return res.status(404).json({ success: false, message: "No investments found for this user." });
        }

        // Calculate the investment details
        const investmentDetails = investments.map(investment => {
            const { planName, amount, apr, startDate, endDate, maturityAmount } = investment;

            // Convert startDate and endDate to Date objects
            const start = new Date(startDate);
            const end = new Date(endDate);

            // 🔹 Calculate tenure in months
            const tenure = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30)); 

            // 🔹 Yield to Maturity (YTM) Calculation
            const YTM = ((maturityAmount - amount) / amount) * 100;

            // 🔹 Total Profit Earned
            const totalProfit = maturityAmount - amount;

            return {
                planName,
                tenure: `${tenure} months`,
                minInvestment: amount,
                yieldToMaturity: `${YTM.toFixed(2)}%`,
                totalProfit
            };
        });

        res.status(200).json({ success: true, investments: investmentDetails });
    } catch (error) {
        console.error("Error fetching investment details:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔹 Fetch Investments with YTM & Profit
// router.get("/investments", protect, async (req, res) => {
//     try {
//         const userId = req.user.id;

//         // Fetch user's investments & populate plan details
//         const investments = await Investment.find({ user: userId }).populate("plan");

//         if (!investments.length) {
//             return res.status(404).json({ success: false, message: "No investments found" });
//         }

//         // Calculate profit percentage and YTM
//         const investmentData = investments.map(investment => {
//             const plan = investment.plan;

//             // Calculate Yield to Maturity (YTM)
//             const principal = investment.amount;
//             const rate = plan.apy / 100;
//             const timeInYears = (new Date(investment.endDate) - new Date(investment.startDate)) / (365 * 24 * 60 * 60 * 1000);
//             const maturityValue = principal * Math.pow((1 + rate), timeInYears); // Compound interest formula

//             // Calculate profit percentage
//             const profit = maturityValue - principal;
//             const profitPercentage = ((profit / principal) * 100).toFixed(2);

//             return {
//                 planName: investment.planName,
//                 amountInvested: principal,
//                 minInvestment: plan.minInvestment,
//                 tenure: plan.tenureOptions,
//                 yieldToMaturity: maturityValue.toFixed(2),
//                 profitEarned: profit.toFixed(2),
//                 profitPercentage: `${profitPercentage}%`
//             };
//         });

//         res.status(200).json({ success: true, investments: investmentData });
//     } catch (error) {
//         console.error("Error fetching investments:", error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });
// Fetch total investments, current investments, total returns, and current invested amount
router.get("/user/investments", protect, async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all investments by the user
        const investments = await Investment.find({ user: userId });

        if (!investments.length) {
            return res.status(404).json({ success: false, message: "No investments found." });
        }

        let totalInvestments = 0;
        let totalReturns = 0;
        let currentInvested = 0;
        let currentInvestmentsList = [];

        investments.forEach(investment => {
            totalInvestments += investment.amount;

            if (new Date(investment.endDate) > new Date()) {
                // If the investment is still active
                currentInvested += investment.amount;
                currentInvestmentsList.push({
                    planName: investment.planName,
                    amount: investment.amount,
                    apr: investment.apy,
                    startDate: investment.startDate,
                    endDate: investment.endDate,
                    maturityAmount: investment.maturityAmount,
                    status: investment.status
                });
            } else {
                // If the investment has matured
                totalReturns += investment.maturityAmount - investment.amount;
            }
        });

        res.status(200).json({
            success: true,
            amount  : totalInvestments,
            totalInvestments,
            currentInvested,
            totalReturns,
            currentInvestments: currentInvestmentsList
        });

    } catch (error) {
        console.error("Error fetching investment details:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
function calculateInvestmentSchedule(principal, apy, tenureMonths) {
    let monthlyRate = apy / 12 / 100;
    let monthlyInterest = principal * monthlyRate;
    let totalMonthlyReturns = principal + monthlyInterest;

    return {
        principal,
        monthlyInterest,
        totalMonthlyReturns
    };
}

// @route   GET /api/investments/:investmentId/schedule
// @desc    Get investment schedule
// @access  Private
// router.get('/:investmentId/schedule', protect, async (req, res) => {
//     try {
//         const investment = await Investment.findById(req.params.investmentId).populate('plan');

//         if (!investment) {
//             return res.status(404).json({ success: false, message: "Investment not found" });
//         }

//         const { amount, tenureMonths, plan } = investment;
//         const { apy } = plan;
        
//         let schedule = calculateInvestmentSchedule(amount, apy, tenureMonths);
        
//         res.json({
//             success: true,
//             investmentId: investment._id,
//             planName: plan.name,
//             tenureMonths,
//             principal: schedule.principal,
//             monthlyInterest: schedule.monthlyInterest.toFixed(2),
//             totalMonthlyReturns: schedule.totalMonthlyReturns.toFixed(2)
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// });

// router.get('/:investmentId/schedule/pdf', protect, async (req, res) => {
//   try {
//       const investment = await Investment.findById(req.params.investmentId).populate('plan');

//       if (!investment) {
//           return res.status(404).json({ success: false, message: "Investment not found" });
//       }

//       const { amount, startDate, endDate, plan } = investment;
//       const { apy, minInvestment, tenureOptions, name } = plan;

//       // 🔹 Calculate number of units
//       const units = amount / minInvestment;

//       // 🔹 Calculate interest per unit
//       const monthlyRate = apy / 12 / 100;
//       const monthlyInterestPerUnit = minInvestment * monthlyRate;

//       // 🔹 Total Monthly Interest
//       const totalMonthlyInterest = monthlyInterestPerUnit * units;

//       // 🔹 Total Profit
//       const totalProfit = (amount * apy) / 100;

//       // 🔹 Final Maturity Value
//       const totalMaturityAmount = amount + totalProfit;

//       // 🔹 Format dates
//       const formattedStartDate = new Date(startDate).toLocaleDateString();
//       const formattedEndDate = new Date(endDate).toLocaleDateString();

//       // 🔹 Create PDF
//       const doc = new PDFDocument({ margin: 30, size: "A1", layout: "landscape" }); // Landscape mode for more space
//       res.setHeader('Content-Disposition', 'attachment; filename="investment_schedule.pdf"');
//       res.setHeader('Content-Type', 'application/pdf');
//       doc.pipe(res);

//       // 🔹 PDF Title
//       doc.fontSize(16).text('Investment Schedule', { align: 'center' }).moveDown();

//       // 🔹 Define Column Headers & Data (Horizontal Table)
//       const columnHeaders = [
//           "Plan Name", "Start Date", "End Date", "Tenure", "Investment",
//           "Units", "APY", "Monthly Interest/Unit", "Total Monthly Interest",
//           "Total Profit", "Maturity Amount"
//       ];

//       const columnData = [
//           name, formattedStartDate, formattedEndDate, tenureOptions[0],
//           `₹${amount.toFixed(2)}`, units.toFixed(2), `${apy}%`,
//           `₹${monthlyInterestPerUnit.toFixed(2)}`, `₹${totalMonthlyInterest.toFixed(2)}`,
//           `₹${totalProfit.toFixed(2)}`, `₹${totalMaturityAmount.toFixed(2)}`
//       ];

//       // 🔹 Generate Column Table
//       generateColumnTable(doc, columnHeaders, columnData);

//       doc.end();

//   } catch (error) {
//       console.error("Error generating investment schedule PDF:", error);
//       res.status(500).json({ success: false, message: "Server Error" });
//   }
// });

// // 🔹 Function to generate columns
// function generateColumnTable(doc, headers, data) {
//   let startX = 50;
//   const startY = doc.y + 20;
//   const columnWidth = 110; // Adjust width per column
//   const rowHeight = 25;

//   // Draw column headers (Bold)
//   doc.font("Helvetica-Bold").fontSize(10);
//   headers.forEach((header, index) => {
//       doc.text(header, startX + index * columnWidth, startY, { width: columnWidth, align: "center" });
//   });

//   // Draw column data (Regular Font)
//   doc.font("Helvetica").fontSize(10);
//   const dataY = startY + rowHeight;
//   data.forEach((value, index) => {
//       doc.text(value, startX + index * columnWidth, dataY, { width: columnWidth, align: "center" });
//   });

//   doc.moveDown();
// }

// 🔹 API 1: Generate and Save PDF
router.get('/:investmentId/schedule/pdf/generate', protect, async (req, res) => {
  try {
      const investment = await Investment.findById(req.params.investmentId).populate('plan');

      if (!investment) {
          return res.status(404).json({ success: false, message: "Investment not found" });
      }

      const { amount, startDate, endDate, plan } = investment;
      const { apy, minInvestment, tenureOptions, name } = plan;

      // 🔹 Calculate financial values
      const units = amount / minInvestment;
      const monthlyRate = apy / 12 / 100;
      const monthlyInterestPerUnit = minInvestment * monthlyRate;
      const totalMonthlyInterest = monthlyInterestPerUnit * units;
      const totalProfit = (amount * apy) / 100;
      const totalMaturityAmount = amount + totalProfit;

      // 🔹 Format dates
      const formattedStartDate = new Date(startDate).toLocaleDateString();
      const formattedEndDate = new Date(endDate).toLocaleDateString();

      // 🔹 Define PDF file path
      const pdfFileName = `investment_schedule_${investment._id}.pdf`;
      const pdfFilePath = path.join(__dirname, '../downloads', pdfFileName);

      // Ensure the downloads directory exists
      if (!fs.existsSync(path.join(__dirname, '../downloads'))) {
          fs.mkdirSync(path.join(__dirname, '../downloads'));
      }

      // 🔹 Create PDF
      const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
      const writeStream = fs.createWriteStream(pdfFilePath);
      doc.pipe(writeStream);

      // 🔹 PDF Title
      doc.fontSize(16).text('Investment Schedule', { align: 'center' }).moveDown();

      // 🔹 Define Column Headers & Data (Horizontal Table)
      const columnHeaders = [
          "Plan Name", "Start Date", "End Date", "Tenure", "Investment",
          "Units", "APY", "Monthly Interest/Unit", "Total Monthly Interest",
          "Total Profit", "Maturity Amount"
      ];

      const columnData = [
          name, formattedStartDate, formattedEndDate, tenureOptions[0],
          `₹${amount.toFixed(2)}`, units.toFixed(2), `${apy}%`,
          `₹${monthlyInterestPerUnit.toFixed(2)}`, `₹${totalMonthlyInterest.toFixed(2)}`,
          `₹${totalProfit.toFixed(2)}`, `₹${totalMaturityAmount.toFixed(2)}`
      ];

      // 🔹 Generate Column Table
      generateColumnTable(doc, columnHeaders, columnData);

      doc.end();

      // 🔹 Wait for file to be written, then respond with download link
      writeStream.on('finish', () => {
          res.json({
              success: true,
              message: "PDF generated successfully",
              downloadUrl: `/api/investments/${investment._id}/schedule/pdf/download`
          });
      });

  } catch (error) {
      console.error("Error generating investment schedule PDF:", error);
      res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 🔹 API 2: Download PDF
router.get('/:investmentId/schedule/pdf/download', protect, async (req, res) => {
  try {
      const investmentId = req.params.investmentId;
      const pdfFilePath = path.join(__dirname, '../downloads', `investment_schedule_${investmentId}.pdf`);

      if (!fs.existsSync(pdfFilePath)) {
          return res.status(404).json({ success: false, message: "PDF not found. Please generate it first." });
      }

      res.download(pdfFilePath, `investment_schedule_${investmentId}.pdf`, (err) => {
          if (err) {
              console.error("Error downloading PDF:", err);
              res.status(500).json({ success: false, message: "Error downloading PDF" });
          }
      });

  } catch (error) {
      console.error("Error in download API:", error);
      res.status(500).json({ success: false, message: "Server Error" });
  }
});

// 🔹 Function to generate columns
function generateColumnTable(doc, headers, data) {
  let startX = 50;
  const startY = doc.y + 20;
  const columnWidth = 110;
  const rowHeight = 25;

  doc.font("Helvetica-Bold").fontSize(10);
  headers.forEach((header, index) => {
      doc.text(header, startX + index * columnWidth, startY, { width: columnWidth, align: "center" });
  });

  doc.font("Helvetica").fontSize(10);
  const dataY = startY + rowHeight;
  data.forEach((value, index) => {
      doc.text(value, startX + index * columnWidth, dataY, { width: columnWidth, align: "center" });
  });

  doc.moveDown();
}
router.get("/faq", async (req, res) => {
    try {
        const faqs = await FAQ.find().sort({ createdAt: -1 });
        res.json({ success: true, faqs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// rewards users can see 
router.get('/user-rewards/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const totalInvestment = user.totalInvestment;
        const eligibleRewards = await Reward.find({ amountRequired: { $lte: totalInvestment } });

        res.status(200).json({ totalInvestment, eligibleRewards });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
router.post('/upload-query', protect , async (req, res) => {
  try {
      const { queryText } = req.body;

      if (!req.user) {
          return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
      }

      const user = req.user; // Now user should not be null

      if (!queryText) {
          return res.status(400).json({ message: 'Query text is required' });
      }

      const mailOptions = {
          from: user.email,
          to: process.env.EMAIL_USER, // Admin's email
          subject: `New Query from ${user.email}`,
          text: `User: ${user.email} (${user.email})\nQuery: ${queryText}`
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: 'Query sent successfully' });
  } catch (error) {
      console.error('Error sending query email:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

// // investment plans 
// router.post('/invest', async (req, res) => {
//   try {
//       const { userId, planId, tenure } = req.body;
      
//       // Fetch user and plan details
//       const user = await User.findById(userId);
//       const plan = await Plan.findById(planId);
//       if (!user || !plan) {
//           return res.status(404).json({ message: 'User or Plan not found' });
//       }

//       // Fetch minimum investment amount from the plan
//       const amount = plan.minInvestment;
      
//       // Check if the user has enough balance
//       if (user.walletBalance < amount) {
//           return res.status(400).json({ message: 'Insufficient wallet balance' });
//       }

//       // Deduct the amount from the user's wallet
//       user.walletBalance -= amount;
//       await user.save();
      
//       // Interest Calculation: SI = P * R * T / 100
//       const tenureInYears = parseInt(tenure) / 12; // Convert months to years
//       const interest = (amount * plan.apy * tenureInYears) / 100;
//       const tax = interest * 0.10; // 10% tax on interest
//       const totalReturns = amount + interest - tax;

//       // Create a new investment record
//       const investment = new Investment({
//           user: userId,
//           plan: planId,
//           planName: plan.name,
//           amount: amount,
//           apr: plan.apy,
//           startDate: new Date(),
//           endDate: new Date(new Date().setMonth(new Date().getMonth() + parseInt(tenure))),
//           maturityAmount: totalReturns,
//           status: 'active',
//           totalReturns: totalReturns
//       });

//       await investment.save();
//       res.status(201).json({ message: 'Investment successful', investment, tenure: tenureInYears , interest: interest, tax: tax,totalReturns: totalReturns});
//   } catch (error) {
//       res.status(500).json({ message: 'Server error', error });
//   }
// });


  router.get('/quiz', async (req, res) => {
    try {
      const quizzes = await Quiz.find({}, 'question options'); // Do not send correct answers
      res.status(200).json(quizzes);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  router.post('/quiz-submit', async (req, res) => {
    try {
      const { answers } = req.body; // Expect an array of { quizId, answer }
      
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: 'Invalid answer format' });
      }
  
      let score = 0;
      for (const { quizId, answer } of answers) {
        const quiz = await Quiz.findById(quizId);
        if (quiz && quiz.correctAnswer === answer) {
          score++;
        }
      }
  
      res.status(200).json({ message: 'Quiz submitted', score });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });  

//   router.post('/buy', async (req, res) => {
//     try {
//         const { userId, planId, units, paymentMethod } = req.body;

//         // Fetch user and plan details
//         const user = await User.findById(userId);
//         const plan = await Plan.findById(planId);

//         if (!user || !plan) {
//             return res.status(404).json({ message: 'User or Plan not found' });
//         }

//         // Calculate total amount based on units
//         const pricePerUnit = plan.pricePerUnit; // Assume this exists in Plan schema
//         const totalAmount = pricePerUnit * units;

//         // Check if user has enough balance
//         if (user.walletBalance < totalAmount) {
//             return res.status(400).json({ message: 'Insufficient wallet balance' });
//         }

//         // Calculate maturity amount based on APR
//         const apr = plan.apr;
//         const duration = plan.duration; // Assuming in months
//         const maturityAmount = totalAmount * (1 + (apr / 100) * (duration / 12));

//         // Deduct amount from wallet balance
//         user.walletBalance -= totalAmount;
//         user.totalInvestment += totalAmount;

//         // Create investment entry
//         const investment = new Investment({
//             user: userId,
//             plan: planId,
//             planName: plan.name,
//             units,
//             pricePerUnit,
//             amount: totalAmount,
//             apr,
//             startDate: new Date(),
//             endDate: new Date(new Date().setMonth(new Date().getMonth() + duration)),
//             maturityAmount,
//             paymentMethod,
//             status: 'active'
//         });

//         await investment.save();
//         await user.save();

//         res.status(201).json({ message: 'Investment successful', investment });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// });


// api for request of users to deposti the payement 
router.post('/request', protect, async (req, res) => {
    try {
      const { bankName, amount, transactionId } = req.body;
  
      // Validate input
      if (!bankName || !amount || !transactionId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide bank name, amount, and transaction ID' 
        });
      }
  
      // Check if amount is positive
      if (amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Amount must be greater than zero' 
        });
      }
  
      // Check if transaction ID already exists
      const existingRequest = await PaymentRequest.findOne({ transactionId });
      if (existingRequest) {
        return res.status(400).json({ 
          success: false, 
          message: 'Transaction ID already submitted' 
        });
      }
  
      // Create payment request
      const paymentRequest = new PaymentRequest({
        user: req.user._id,
        bankName,
        amount,
        transactionId
      });
  
      await paymentRequest.save();
  
      // Fetch user email
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
  
      // Send email notification
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Payment Request Submitted',
        html: `
          <h2>Payment Request Submitted Successfully</h2>
          <p>Dear ${user.username},</p>
          <p>Your payment request has been submitted successfully with the following details:</p>
          <ul>
            <li><strong>Bank Name:</strong> ${bankName}</li>
            <li><strong>Amount:</strong> ₹${amount}</li>
            <li><strong>Transaction ID:</strong> ${transactionId}</li>
            <li><strong>Status:</strong> Pending</li>
          </ul>
          <p>We will review your request and update the status soon.</p>
          <p>Thank you for using our service!</p>
        `
      };
  
      await transporter.sendMail(mailOptions);
  
      res.status(200).json({
        success: true,
        message: 'Payment request submitted successfully. Email confirmation sent.',
        data: paymentRequest
      });
  
    } catch (error) {
      console.error('Error creating payment request:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creating payment request',
        error: error.message 
      });
    }
  });
  // payement added to the wallet 
  router.get('/wallet', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('walletBalance');
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.status(200).json({
            success: true,
            walletBalance: user.walletBalance || 0
        });

    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching wallet balance',
            error: error.message 
        });
    }
});

// withdrawls 

// router.post('/withdraw', protect, [
//     body('amount').isNumeric().withMessage('Amount must be a number'),
//     body('accountNumber').isString().notEmpty().withMessage('Account number is required'),
//     body('upiId').optional().isString(),
//     body('bankName').isString().notEmpty().withMessage('Bank name is required')
// ], async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ errors: errors.array() });
//     }

//     try {
//         const user = await User.findById(req.user.id);
//         if (!user) {
//             return res.status(404).json({ success : false,  message: 'User not found' });
//         }

//         if (user.walletBalance < req.body.amount) {
//             return res.status(400).json({ success : false ,  message: 'Insufficient balance' });
//         }
//       const transactionId = uuidv4();

//         // Create withdrawal request
//         const withdrawalRequest = new PaymentRequest({
//             user: user._id,
//             bankName: req.body.bankName,
//             amount: req.body.amount,
//                    transactionId,
//  // Generate unique transaction ID
//             status: 'pending'
//         });

//         await withdrawalRequest.save();

//         // Send confirmation email to the user
//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: user.email,
//             subject: 'Withdrawal Request Received',
//             text: `Dear ${user.username},\n\nYour withdrawal request of ₹${req.body.amount} has been received.\nWe will process it soon.\n\nBest Regards,\nAdmin`
//         };

//         transporter.sendMail(mailOptions, (error, info) => {
//             if (error) {
//                 console.error('Email error:', error);
//             } else {
//                 console.log('Email sent:', info.response);
//             }
//         });

//         res.status(201).json({success : true , message: 'Withdrawal request submitted successfully', request: withdrawalRequest });
//     } catch (error) {
//         res.status(500).json({ success : false, message: 'Server error', error: error.message });
//     }
// });
router.post('/withdraw', protect, [
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('accountNumber').isString().notEmpty().withMessage('Account number is required'),
  body('ifscCode').isString().notEmpty().withMessage('IFSC Code is required'),
  body('upiId').optional().isString(),
  body('bankName').isString().notEmpty().withMessage('Bank name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
  }

  try {
      const user = await User.findById(req.user.id);
      if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.walletBalance < req.body.amount) {
          return res.status(400).json({ success: false, message: 'Insufficient balance' });
      }

      const transactionId = uuidv4(); // Generate a unique transaction ID

      // Create withdrawal request (Pending Approval)
      const withdrawalRequest = new PaymentRequest({
          user: user._id,
          bankName: req.body.bankName,
          amount: req.body.amount,
          transactionId,
          ifscCode: req.body.ifscCode,
          accountNumber: req.body.accountNumber,
          upiId: req.body.upiId || '',
          status: 'pending' // Admin needs to approve it
      });

      await withdrawalRequest.save();

      // Send confirmation email to the user
      const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'Withdrawal Request Received',
          text: `Dear ${user.username},\n\nYour withdrawal request of ₹${req.body.amount} has been received.\nWe will process it soon.\n\nBest Regards,\nAdmin`
      };

      transporter.sendMail(mailOptions, (error, info) => {
          if (error) console.error('Email error:', error);
      });

      res.status(201).json({
          success: true,
          message: 'Withdrawal request submitted successfully',
          request: withdrawalRequest
      });

  } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

//
  
  router.get('/transactions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if the user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch all transactions for the user
        const transactions = await PaymentRequest.find({ user: userId }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, transactions });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
router.post('/sell', async (req, res) => {
    try {
        const { userId, investmentId } = req.body;

        // Fetch investment and user
        const investment = await Investment.findById(investmentId);
        const user = await User.findById(userId);

        if (!investment || !user) {
            return res.status(404).json({ message: 'Investment or User not found' });
        }

        // Check if investment is already completed or cancelled
        if (investment.status !== 'active') {
            return res.status(400).json({ message: 'Investment cannot be sold' });
        }

        // Check if the investment is eligible for selling
        const currentDate = new Date();
        if (currentDate < investment.endDate) {
            return res.status(400).json({ message: 'Investment cannot be sold before maturity' });
        }

        // Calculate the payout amount
        const payoutAmount = investment.maturityAmount;

        // Update user wallet balance
        user.walletBalance += payoutAmount;

        // Update investment status
        investment.status = 'completed';

        await investment.save();
        await user.save();

        res.status(200).json({ message: 'Investment sold successfully', payoutAmount });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/categories', async (req, res) => {
  try {
    const categories = await Plan.distinct('category'); // Get unique category values
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});
router.post('/sell-investment', protect, async (req, res) => {
  try {
    const { investmentId, units } = req.body;

    // Extract userId from the token
    const userId = req.user.id;
    console.log("Authenticated User ID:", userId);

    // Find the investment
    const investment = await Investment.findOne({ _id: investmentId, user: userId });

    if (!investment) {
      return res.status(404).json({ message: 'Investment not found or does not belong to user' });
    }

    // Check if the user is trying to sell more units than they own
    if (units > investment.units) {
      return res.status(400).json({ message: 'Not enough units to sell' });
    }

    // Calculate refund amount based on the units sold
    const perUnitMaturityAmount = investment.maturityAmount / investment.units;
    const refundAmount = perUnitMaturityAmount * units;

    // Find the user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update wallet balance
    user.walletBalance += refundAmount;
    await user.save();

    // Deduct sold units from investment
    investment.units -= units;
    investment.maturityAmount -= refundAmount;

    // If all units are sold, mark investment as 'sold'
    if (investment.units === 0) {
      investment.status = 'sold';
      investment.soldDate = new Date();
    }

    await investment.save();

    return res.status(200).json({ 
      message: `Successfully sold ${units} unit(s)`, 
      refundAmount, 
      remainingUnits: investment.units,
      investment 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
router.get('/support', async (req, res) => {
  try {
    const supportDetails = {
      adminEmail: "sunidhiratra21@gmail.com",
      experience: "6+ years",
      totalInvestments: "250+ Cr"
    };

    return res.status(200).json(supportDetails);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
//67e02ee2abbc823b4505e9a7
//sunidhiratra21@gmail.com:67e01a39035bcb0216d1d471



// plan id : 67e3bea9c0126dbbfb7b2de9