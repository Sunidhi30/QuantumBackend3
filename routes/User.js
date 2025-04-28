const express = require("express");
const InvestmentTransaction = require("../models/InvestmentTransaction");
const router = express.Router();
const axios = require('axios');
const cloudinary = require("cloudinary");
const { Readable } = require('stream');
const streamifier = require('streamifier');
const Plan = require("../models/Plan"); // Import Plan model
const { protect } = require("../middlewares/authMiddlewares"); // Only authentication required
const User = require("../models/User"); // Ensure correct path
const { uploadToCloudinary } = require("../utils/cloudinary");
// const {uploadsCloudinary}= require("../utils/cloudinary");
const multer = require("multer");
const streamBuffers = require("stream-buffers");
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
const ExcelJS = require('exceljs');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email provider
    auth: {
      user: process.env.EMAIL_USER, // Admin email (set in environment variables)
      pass: process.env.EMAIL_PASS // Admin email password (use env variables for security)
    }
  });
router.get('/user-profile', protect, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password'); // Exclude password
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.json({ user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
// update the users profile
// router.put('/update-profile', protect, [
 
//   body('mobileNumber').optional().isMobilePhone(),
//   body('email').optional().isEmail().normalizeEmail()
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { mobileNumber, email} = req.body;
//     const updateFields = {};

    
//     if (mobileNumber) updateFields.mobileNumber = mobileNumber;
//     if (email) updateFields.email = email;
   

//     const updatedUser = await User.findByIdAndUpdate(req.user.id, updateFields, { new: true });

//     if (!updatedUser) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     res.json({ message: 'Profile updated successfully', user: updatedUser });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });
// PUT: Update profile with optional image uploa
router.put(
  '/update-profile',
  protect,
  upload.single('profilePicture'),
  [
    
    body('email').optional().isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const updateFields = {};

      if (email) updateFields.email = email;

      // ✅ Upload image if available
      if (req.file) {
        const imageUrl = await uploadToCloudinary(
          req.file.buffer,
          'user_profiles',
          req.file.mimetype
        );
        updateFields.profilePicture = imageUrl; // This matches your schema field
      }
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        updateFields,
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);
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
//kycs of the users 
router.post(
  "/kyc",
  protect,
  upload.fields([{ name: "idProof", maxCount: 1 }]), // Aadhaar or Passport
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { nationality, idNumber } = req.body;
      if (!nationality || !idNumber) {
        return res.status(400).json({ message: "Nationality and ID number are required" });
      }

      if (!req.files || !req.files.idProof) {
        return res.status(400).json({ message: "ID Proof document is required" });
      }
      // Upload ID Proof to Cloudinary - now with the forDisplay parameter set to true
      const idProofUrl = await uploadToCloudinary(
        req.files.idProof[0].buffer,
        "kyc_docs",
        req.files.idProof[0].mimetype,
        true // Set to true to display in browser instead of downloading
      );
      // Ensure kycDocuments exists and update it
      if (!user.kycDocuments) {
        user.kycDocuments = {};
      }
      user.kycDocuments.idProof = idProofUrl;
      user.kycDocuments.idNumber=idNumber;
      // user.kycDocuments.idNumber = Number(idNumber); // Convert to Number to match schema

      console.log("Before saving:", user.kycDocuments);
      user.kycStatus = "pending";
      await user.save();
      console.log("After saving:", user.kycDocuments);
      console.log("", user.kycDocuments )
      
      res.status(200).json({
        userId: req.user.id,
        success: true,
        message: "KYC submitted successfully. Waiting for admin approval.",
        idproof: user.kycDocuments.idProof,
        // urls: user.kycDocuments,
      });
    } catch (error) {
      console.error("KYC Upload Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
router.get("/kyc-status", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("kycStatus kycDocuments");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      kycStatus: user.kycStatus, // pending, approved, rejected etc.
      kycDocuments: user.kycDocuments, // optional - if you want to show the uploaded docs too
    });
  } catch (error) {
    console.error("Get KYC Status Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// list of the docs of kyc
router.get('/kyc-documents', protect, async (req, res) => {
  try {
      const user = await User.findById(req.user.id);
      console.log("Retrieved user:", user);
      console.log("Retrieved KYC Documents:", user.kycDocuments);

      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      if (!user.kycDocuments || !user.kycDocuments.idProof) {
          return res.status(404).json({ message: "No KYC documents found" });
      }

      res.status(200).json({
          success: true,
          kycDocuments: user.kycDocuments,
          kycStatus: user.kycStatus
      });

  } catch (error) {
      console.error("Error fetching KYC documents:", error);
      res.status(500).json({ message: "Internal server error" });
  }
});

// / First, let's create an endpoint to calculate the amount payable based on units
router.post("/investments/calculate", async (req, res) => {
  try {
    const { planId, units } = req.body;
    
    // Validate required fields
    if (!planId || !units || units <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Plan ID and a valid number of units are required" 
      });
    }
    
    // Fetch the investment plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: "Plan not found or inactive" 
      });
    }
    
    // Calculate investment amount
    const investmentAmount = units * plan.minInvestment;
    
    // Calculate tax amount (assuming 18% GST or whatever tax rate you need)
    const taxRate = 0.18; // 18% tax rate - adjust as needed
    const taxAmount = investmentAmount * taxRate;
    
    // Calculate total amount payable (investment + tax)
    const totalAmountPayable = investmentAmount + taxAmount;
    
    // Calculate maturity date based on tenure
    const tenureInMonths = parseInt(plan.tenureOptions[plan.tenureOptions.length - 1]);
    const tenureInYears = tenureInMonths / 12;
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + tenureInMonths);
    
    // Calculate estimated returns
    const principal = investmentAmount;
    const rate = plan.apy / 100; // Convert APY to decimal
    const n = 12; // Monthly compounding
    const t = tenureInYears;
    
    // Calculate compound interest
    const maturityAmount = principal * Math.pow((1 + rate/n), n * t);
    const totalReturns = maturityAmount - principal;
    
    res.status(200).json({
      success: true,
      data: {
        planName: plan.name,
        units,
        minimumInvestments: plan.minInvestment,
        investmentAmount,
        taxAmount,
        totalAmountPayable,
        maturityDate,
        maturityAmount: parseFloat(maturityAmount.toFixed(2)),
        totalReturns: parseFloat(totalReturns.toFixed(2))
      }
    });
  } catch (error) {
    console.error("Error calculating investment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate investment details",
      error: error.message
    });
  }
});

router.get("/investments/pdf-view/:planId/:units", async (req, res) => {
  try {
    const { planId, units } = req.params;
    const { action } = req.query; // 'download' or 'view'

    console.log("Plan ID:", planId);
    console.log("Units:", units);

    // Validation
    if (!planId || !units || units <= 0) {
      return res.status(400).json({
        success: false,
        message: "Plan ID and a valid number of units are required",
      });
    }

    const plan = await Plan.findById(planId);

    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: "Plan not found or inactive",
      });
    }

    // Calculate Investment Details
    const investmentAmount = units * plan.minInvestment;
    const rate = plan.apy / 100;
    const tenureInMonths = parseInt(plan.tenureOptions[plan.tenureOptions.length - 1]);
    const tenureInYears = tenureInMonths / 12;
    const n = 12; // Compounding frequency (monthly)
    const t = tenureInYears;
    const maturityAmount = investmentAmount * Math.pow((1 + rate / n), n * t);
    const totalReturns = maturityAmount - investmentAmount;

    const interest = totalReturns.toFixed(2);
    const principal = investmentAmount.toFixed(2);
    const total = maturityAmount.toFixed(2);

    const date = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // === Create PDF ===
    const doc = new PDFDocument({ margin: 50 });

    // Set headers
    res.setHeader("Content-Type", "application/pdf");
    if (action === "download") {
      res.setHeader("Content-Disposition", "attachment; filename=investment_preview.pdf");
    } else {
      res.setHeader("Content-Disposition", "inline; filename=investment_preview.pdf");
    }

    doc.pipe(res); // Pipe to response

    // === PDF Content ===
    try {
      doc.image("images/image.png", 50, 50, { width: 50, height: 50 });
    } catch (error) {
      console.warn("Image not found or error loading image:", error.message);
    }

    doc.font("Helvetica-Bold")
      .fontSize(34)
      .text("Visualise Returns", { align: "center" });

    doc.moveDown(2);

    const tableTop = doc.y;
    const columnPositions = {
      date: 50,
      principal: 180,
      interest: 310,
      total: 440,
    };

    // Headings
    doc.font("Helvetica-Bold").fontSize(12)
      .text("Date", columnPositions.date, tableTop)
      .text("Principal", columnPositions.principal, tableTop)
      .text("Interest", columnPositions.interest, tableTop)
      .text("Total Returns", columnPositions.total, tableTop);

    // Values
    doc.font("Helvetica").fontSize(12)
      .text(date, columnPositions.date, tableTop + 25)
      .text(`₹${principal}`, columnPositions.principal, tableTop + 25)
      .text(`₹${interest}`, columnPositions.interest, tableTop + 25)
      .text(`₹${total}`, columnPositions.total, tableTop + 25);

    doc.end(); // Finish writing PDF
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF",
      error: error.message,
    });
  }
});
// Create folder if not exists
router.post('/users/investments/pdf', async (req, res) => {
  try {
    const { planId, units, action } = req.body;

    if (!planId || !units || units <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID and a valid number of units are required',
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive',
      });
    }

    const investmentAmount = units * plan.minInvestment;
    const rate = plan.apy / 100;
    const tenureOption = plan.tenureOptions[plan.tenureOptions.length - 1];
    const tenureInMonths = parseInt(tenureOption);
    const tenureInYears = tenureInMonths / 12;
    const n = 12;
    const t = tenureInYears;
    const maturityAmount = investmentAmount * Math.pow(1 + rate / n, n * t);
    const totalReturns = maturityAmount - investmentAmount;
    const interest = totalReturns.toFixed(2);
    const principal = investmentAmount.toFixed(2);
    const total = maturityAmount.toFixed(2);
    const date = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    if (action === 'view') {
      res.setHeader('Content-Disposition', 'inline; filename=investment_preview.pdf');
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename=investment_preview.pdf');
    }

    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(20).text('Investment Summary', { align: 'center' });
    doc.moveDown();
    doc.font('Helvetica').fontSize(12).text(`Date: ${date}`);
    doc.text(`Plan Name: ${plan.name}`);
    doc.text(`Units: ${units}`);
    doc.text(`Principal: ₹${principal}`);
    doc.text(`Interest: ₹${interest}`);
    doc.text(`Total Returns: ₹${total}`);

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
});
// Now, let's update the investment creation endpoint to use the calculated values
router.post("/investments/confirm", protect, async (req, res) => {
  try {
    const { planId, units, totalAmountPayable } = req.body;

    if (!planId || !units || units <= 0 || !totalAmountPayable) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const user = await User.findById(req.user._id);

    if (user.walletBalance < totalAmountPayable) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    }

    // Deduct from wallet
    user.walletBalance -= totalAmountPayable;
    await user.save();

    // Compute dates and returns again for security
    const investmentAmount = units * plan.minInvestment;
    const taxAmount = investmentAmount * 0.18;
    const maturityDate = new Date();
    const tenureInMonths = parseInt(plan.tenureOptions[plan.tenureOptions.length - 1]);
    const tenureInYears = tenureInMonths / 12;
    maturityDate.setMonth(maturityDate.getMonth() + tenureInMonths);

    const principal = investmentAmount;
    const rate = plan.apy / 100;
    const n = 12;
    const t = tenureInYears;
    const maturityAmount = principal * Math.pow((1 + rate / n), n * t);
    const totalReturns = maturityAmount - principal;

    // Create investment
    const investment = await Investment.create({
      user: user._id,
      plan: planId,
      planName: plan.name,
      units,
      amount: investmentAmount,
      TAXAmount: taxAmount,
      apr: plan.apy,
      endDate: maturityDate,
      maturityAmount: parseFloat(maturityAmount.toFixed(2)),
      totalReturns: parseFloat(totalReturns.toFixed(2)),
      status: "active"
    });
     // Create a dynamic transaction ID
     const transactionId = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

     // Create transaction record
     await InvestmentTransaction.create({
       user: user._id,
       investment: investment._id,
       amount: totalAmountPayable,
       transactionId: transactionId,
       method: "Wallet Balance",
       status: "buy", // Investment type
       walletBalanceAfterTransaction: user.walletBalance
     });
 
    res.status(201).json({
      success: true,
      message: "Investment successful",
      investment,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    console.error("Investment confirm error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.post("/investments/sell", protect, async (req, res) => {
  try { 
    const { planId, unitsToSell } = req.body;
   
    // Validate input
    if (!planId || !unitsToSell || unitsToSell <= 0) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    // Find the plan
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Plan not found or inactive" });
    }

    // Find the user's investment in the specified plan
    const investment = await Investment.findOne({
      user: req.user._id,
      plan: planId,
    });

    if (!investment) {
      return res.status(404).json({ success: false, message: "No active investment found for this plan" });
    }
  
    console.log("Total units owned: " + investment.units);
       // 🔥 Added check if remaining units are already 0
    if (investment.units <= 0) {
      return res.status(400).json({
        success: false,
        message: "Remaining units is 0. You can't sell."
      });
    }

    // Check if the user has enough units to sell
    if (unitsToSell > investment.units) {
      return res.status(400).json({ success: false, message: "Insufficient units to sell" });
    }

    // Calculate the amount the user will get from selling the units
    const unitSaleAmount = unitsToSell * plan.minInvestment;

    // Update user's wallet balance
    const user = await User.findById(req.user._id);
    user.walletBalance += unitSaleAmount;
    await user.save();

    // Deduct the units from the user's investment, ensuring units do not go below 1
    investment.units -= unitsToSell;
    console.log("units left "+investment.units);
    if (investment.units <= 0) {
      investment.units = 0; // Ensure it doesn't go below 1
      investment.status = "completed"; 
    }
    await investment.save();

    // Create a dynamic transaction ID
    const transactionId = `SELL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create transaction record for selling
    await InvestmentTransaction.create({
      user: user._id,
      investment: investment._id,
      amount: unitSaleAmount,
      transactionId: transactionId,
      method: "Wallet Balance",
      status: "sell", // Withdrawal type
      walletBalanceAfterTransaction: user.walletBalance
    });

    res.status(200).json({
      success: true,
      message: "Investment units sold successfully",
      walletBalance: user.walletBalance,
      totalUnitsOwned: Number(investment.units) + Number(unitsToSell), // Before deducting
      unitsSold: unitsToSell,
      remainingUnits: investment.units
    });
  } catch (error) {
    console.error("Investment sell error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// GET /api/transactions/investments
// router.get("/transactions/investments", protect, async (req, res) => {
//   try {
//     const transactions = await PaymentRequest.find({
//       user: req.user._id,
//       relatedInvestment: { $ne: null }
//     })
//       .populate("relatedInvestment", "planName amount endDate maturityAmount status") // Optional: include details from Investment
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       transactions
//     });
//   } catch (error) {
//     console.error("Error fetching investment transactions:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });
router.get("/investments/stats", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all investments for the user
    const userInvestments = await Investment.find({ user: userId });

    // Separate active investments
    const activeInvestments = userInvestments.filter(inv => inv.status === "active");

    // Total amount ever invested
    const totalInvestedAmount = userInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0);

    // Total returns gained
    const totalReturns = userInvestments.reduce((sum, inv) => sum + Number(inv.totalReturns || 0), 0);

    // Total profit (you can define this differently if needed)
    const totalProfit = totalReturns;

    // Current active investment amount
    const currentInvested = activeInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0);

    res.status(200).json({
      success: true,
      totalInvestedAmount,
      totalReturns,
      totalProfit,
      currentInvested,
      investmentsCount: userInvestments.length,
      activeInvestmentsCount: activeInvestments.length
    });
  } catch (error) {
    console.error("Error fetching investment stats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// get investments according to the user 

// router.get("/investments", protect, async (req, res) => {
//     try {
//       const userId = req.user.id; // Get user ID from token (middleware handles this)

//         // Find investments made by the user
//         const investments = await Investment.find({ user: userId }).populate("plan");

//         if (!investments.length) {
//             return res.status(404).json({ success: false, message: "No investments found for this user." });
//         }

//         // Calculate the investment details
//         const investmentDetails = investments.map(investment => {
//             const { planName, amount, apr, startDate, endDate, maturityAmount } = investment;

//             // Convert startDate and endDate to Date objects
//             const start = new Date(startDate);
//             const end = new Date(endDate);

//             // 🔹 Calculate tenure in months
//             const tenure = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30)); 

//             // 🔹 Yield to Maturity (YTM) Calculation
//             const YTM = ((maturityAmount - amount) / amount) * 100;

//             // 🔹 Total Profit Earned
//             const totalProfit = maturityAmount - amount;

//             return {
//                 planName,
//                 tenure: `${tenure} months`,
//                 minInvestment: amount,
//                 yieldToMaturity: `${YTM.toFixed(2)}%`,
//                 totalProfit
//             };
//         });

//         res.status(200).json({ success: true, investments: investmentDetails });
//     } catch (error) {
//         console.error("Error fetching investment details:", error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });
router.get('/investments', protect, async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from token

    const investments = await Investment.find({ user: userId })
     
      .populate('amount')
      .populate('planName')
      .sort({ createdAt: -1 });

    res.status(200).json(investments);
  } catch (err) {
    console.error('Error fetching investments:', err);
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});
// router.get('/investments-withprofits', protect, async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const investments = await Investment.find({ user: userId }).sort({ createdAt: -1 });

//     // Calculate summary
//     const summary = investments.reduce(
//       (acc, inv) => {
//         acc.totalAmount += inv.amount || 0;
//         acc.totalReturns += inv.totalReturns || 0;
//         acc.totalMaturityAmount += inv.maturityAmount || 0;
//         return acc;
//       },
//       { totalAmount: 0, totalReturns: 0, totalMaturityAmount: 0 }
//     );

//     res.status(200).json({
//       summary,
//       investments
//     });
//   } catch (err) {
//     console.error('Error fetching investments:', err);
//     res.status(500).json({ error: 'Failed to fetch investments' });
//   }
// });
router.get('/investments-withprofits', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch only active or running investments (not sold/completed/cancelled)
    const investments = await Investment.find({
      user: userId,
      status: { $in: ['active', 'running'] }
    }).sort({ createdAt: -1 });

    // Calculate summary based only on active/running investments
    const summary = investments.reduce(
      (acc, inv) => {
        acc.totalAmount += inv.amount || 0;
        acc.totalReturns += inv.totalReturns || 0;
        acc.totalMaturityAmount += inv.maturityAmount || 0;
        return acc;
      },
      { totalAmount: 0, totalReturns: 0, totalMaturityAmount: 0 }
    );

    res.status(200).json({
      summary,
      investments
    });
  } catch (err) {
    console.error('Error fetching investments:', err);
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

// Fetch total investments, current investments, total returns, and current invested amount
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

router.get('/:investmentId/schedule/excel/generate-download', protect, async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.investmentId).populate('plan');

    if (!investment) {
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    const { amount, startDate, endDate, plan } = investment;
    const { apy, minInvestment, tenureOptions, name } = plan;

    const units = amount / minInvestment;
    const monthlyRate = apy / 12 / 100;
    const monthlyInterestPerUnit = minInvestment * monthlyRate;
    const totalMonthlyInterest = monthlyInterestPerUnit * units;
    const totalProfit = (amount * apy) / 100;
    const totalMaturityAmount = amount + totalProfit;

    const formattedStartDate = new Date(startDate).toLocaleDateString();
    const formattedEndDate = new Date(endDate).toLocaleDateString();

    const excelFileName = `investment_schedule_${investment._id}.xlsx`;
    const downloadDir = path.resolve(__dirname, '../downloads');
    const excelFilePath = path.join(downloadDir, excelFileName);

    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Investment Schedule');

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

    // Add headers and data
    sheet.addRow(columnHeaders);
    sheet.addRow(columnData);

    // Optional: style headers
    sheet.getRow(1).font = { bold: true };

    await workbook.xlsx.writeFile(excelFilePath);

    res.download(excelFilePath, excelFileName, (err) => {
      if (err) {
        console.error("Error downloading Excel file:", err);
        res.status(500).json({ success: false, message: "Error downloading Excel file" });
      }
    });

  } catch (error) {
    console.error("Error generating and downloading Excel:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});
// faqs of the users 
router.get("/faq", async (req, res) => {
    try {
        const faqs = await FAQ.find().sort({ createdAt: -1 });
        res.json({ success: true, faqs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// router.get('rewards', async (req, res) => {
//     try {
//         const { userId } = req.params;
//         const user = await User.findById(userId);
        
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         const totalInvestment = user.totalInvestment;
//         const eligibleRewards = await Reward.find({ amountRequired: { $lte: totalInvestment } });

//         res.status(200).json({ totalInvestment, eligibleRewards });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// router.get('/rewards/:userId', async (req, res) => {
//   try {
//       const { userId } = req.params;
//       const user = await User.findById(userId);
      
//       if (!user) {
//           return res.status(404).json({ message: 'User not found' });
//       }

//       // Use wallet balance instead of total investment
//       const walletBalance = user.walletBalance;

//       const eligibleRewards = await Reward.find({
//           amountRequired: { $lte: walletBalance }
//       });

//       res.status(200).json({ walletBalance, eligibleRewards });
//   } catch (error) {
//       res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
router.get('/rewards', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const walletBalance = user.walletBalance;

    const eligibleRewards = await Reward.find({
      amountRequired: { $lte: walletBalance }
    });

    res.status(200).json({ walletBalance, eligibleRewards });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
//upload the query to the admin
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
// quiz of the user
  router.get('/quiz', async (req, res) => {
    try {
      const quizzes = await Quiz.find({}, 'question options'); // Do not send correct answers
      res.status(200).json(quizzes);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  //submit the users quiz
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
  // request to  have money in users account
router.post('/request', protect, async (req, res) => {
  try {
    const { bankName, amount, transactionId } = req.body;

    if (!bankName || !amount || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bank name, amount, and transaction ID'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than zero'
      });
    }

    const existingRequest = await PaymentRequest.findOne({ transactionId });
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID already submitted'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
     // 🔒 KYC STATUS CHECK
     if (user.kycStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'KYC not verified. You cannot perform this action until your KYC is approved.'
      });
    }
    const isCredited = amount > 0; // If amount is positive, it is credited, otherwise debited
    

    // Create payment request with "pending" status
    const paymentRequest = new PaymentRequest({
      user: req.user._id,
      bankName,
      amount,
      isCredited,
      wallet: user.walletBalance, // current balance
      transactionId,
      status: 'pending' // <-- add this field
    });

    await paymentRequest.save();

    res.status(200).json({
      success: true,
      message: 'Payment request submitted successfully. Awaiting admin approval.',
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
// check for the balaance 
const checkSufficientBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const amount = Number(req.body.amount);
    console.log(amount);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
    }

    if (user.walletBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
router.post('/withdraw', protect, checkSufficientBalance, [
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
    console.log("user"+user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const amount = Number(req.body.amount);
    // Deduct the balance from wallet
    user.walletBalance = Number(user.walletBalance) - Number(amount);
    console.log(user.walletBalance)
    await user.save(); // Save updated balance
    const transactionId = uuidv4(); // Generate a unique transaction ID
    const withdrawalRequest = new PaymentRequest({
      user: user._id,
      bankName: req.body.bankName,
      amount,
      isCredited: false,
      transactionId,
      ifscCode: req.body.ifscCode,
      accountNumber: req.body.accountNumber,
      upiId: req.body.upiId || '',
      wallet: user.walletBalance,  // 💡 Save remaining wallet balance here
      status: 'pending'
    });
    await withdrawalRequest.save();
    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Withdrawal Request Received',
      text: `Dear ${user.username},\n\nYour withdrawal request of ₹${amount} has been received.\nWe will process it soon.\n\nBest Regards,\nAdmin`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error('Email error:', error);
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      request: withdrawalRequest
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
// // this si the transaction for adding the money and withdraw 
// router.get('/transactions', protect, async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // Check if the user exists
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Fetch all transactions for the user
//     const transactions = await PaymentRequest.find({ user: userId }).sort({ createdAt: -1});
//     console.log(transactions);

//     res.status(200).json({ success: true, transactions });
//   } catch (error) {
//     console.error('Error fetching transactions:', error);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// });
router.get('/transactions', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch all payment transactions for the user
    const paymentTransactions = await PaymentRequest.find({ user: userId })
      .sort({ createdAt: -1 });

    // Fetch all investment transactions for the user
    const investmentTransactions = await InvestmentTransaction.find({ user: userId })
      .sort({ createdAt: -1 });

    // Combine both sets of transactions into one array
    const allTransactions = [...paymentTransactions, ...investmentTransactions];

    // Sort combined transactions by createdAt (newest first)
    allTransactions.sort((a, b) => b.createdAt - a.createdAt);

    res.status(200).json({ success: true, transactions: allTransactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// transactions history of the user
// router.get('/transactions/:userId', async (req, res) => {
//     try {
//         const { userId } = req.params;

//         // Check if the user exists
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         // Fetch all transactions for the user
//         const transactions = await PaymentRequest.find({ user: userId }).sort({ createdAt: -1 });
//        console.log(transactions)
//         res.status(200).json({ success: true, transactions });
//     } catch (error) {
//         console.error('Error fetching transactions:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// });
// get all the cateoggies (low risk , high yeild )

router.get('/categories', async (req, res) => {
  try {
    const categories = await Plan.distinct('category'); // Get unique category values
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// router.post('/sell', protect, async (req, res) => {
//   try {
//     const { planId, unitsToSell } = req.body;
//     const userId = req.user.id; // from protect middleware

//     if (!planId || !unitsToSell) {
//       return res.status(400).json({ message: "Plan ID and units to sell are required." });
//     }

//     // 1. Find all active investments for this user and plan
//     const investments = await Investment.find({
//       user: userId,
//       plan: planId,
//       status: "active"
//     }).sort({ createdAt: 1 }); // FIFO

//     if (!investments.length) {
//       return res.status(404).json({ message: "No active investments found for this plan." });
//     }

//     // 2. Calculate total available units
//     let totalUnits = investments.reduce((sum, inv) => sum + inv.units, 0);

//     // 3. Check if user has enough units
//     if (totalUnits < unitsToSell) {
//       return res.status(400).json({ message: `Not enough units. Available: ${totalUnits}, Requested: ${unitsToSell}` });
//     }

//     // 4. Selling logic
//     let unitsLeftToSell = unitsToSell;
//     let maturityAmount = 0; // To accumulate maturity amount

//     for (const investment of investments) {
//       if (investment.units <= unitsLeftToSell) {
//         // If the investment has fewer or equal units to sell, sell it all
//         unitsLeftToSell -= investment.units;
//         maturityAmount += investment.units * investment.maturityAmount; // Add maturity amount per unit
//         investment.status = "completed"; // Mark as completed (use completed instead of inactive)
//       } else {
//         // Otherwise, reduce units to sell
//         investment.units -= unitsLeftToSell;
//         maturityAmount += unitsLeftToSell * investment.maturityAmount; // Add maturity amount for remaining units
//         unitsLeftToSell = 0; // All units sold
//       }
//       await investment.save();

//       if (unitsLeftToSell === 0) break; // If all units have been sold, stop
//     }

//     // Check if maturityAmount is a valid number
//     if (isNaN(maturityAmount)) {
//       return res.status(500).json({ message: "Error calculating maturity amount." });
//     }

//     // 5. Update user's wallet balance with maturity amount
//     const user = await User.findById(userId);
//     if (user) {
//       user.walletBalance += maturityAmount; // Add maturity amount to wallet balance
//       user.totalEarnings += maturityAmount; // Optionally, update total earnings as well

//       // Ensure walletBalance and totalEarnings are numbers
//       if (isNaN(user.walletBalance) || isNaN(user.totalEarnings)) {
//         return res.status(500).json({ message: "Error updating wallet balance or total earnings." });
//       }

//       await user.save();
//     }
   
//     // 6. Create PaymentRequest like the /investments/confirm
//     await PaymentRequest.create({
//       user: userId,
//       bankName: "Wallet Balance",
//       amount: maturityAmount,
//       transactionId: `SELL-${Date.now()}-${Math.floor(Math.random() * 10000)}`, // more unique ID
//       status: "approved", // 🟰 make it approved like investment confirm
//       isCredited: true, // 🟰 true because wallet is credited
//       wallet: user.walletBalance, // 🟰 current updated wallet balance
//       relatedInvestment: null, // sell is not linked to specific investment
//       plan: planId,
//       type: "sell",
//       units: unitsToSell,
//       date: new Date()
//     });
//     res.status(200).json({ message: `Units sold successfully! Maturity amount of ${maturityAmount} added to your wallet.` });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error during selling units." });
//   }
// });

// support added the admin details 
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
// const calculateReturns = (plan, units) => {
//   // Get the unit price from plan's minInvestment
//   const unitPrice = plan.minInvestment;
//   const totalPrincipal = unitPrice * units;
  
//   // Get APY from plan
//   const apy = plan.apy / 100;
//   const monthlyRate = apy / 12;
  
//   // Determine tenure in months
//   let tenureMonths = 4; // Default to 4 months as shown in screenshot
  
//   // Check if tenureOptions exists and has values
//   if (plan.tenureOptions && plan.tenureOptions.length > 0) {
//     const tenure = plan.tenureOptions[0]; // Use first option as default
    
//     if (tenure.includes('months')) {
//       tenureMonths = parseInt(tenure.split(' ')[0]);
//     } else if (tenure.includes('year')) {
//       tenureMonths = parseInt(tenure.split(' ')[0]) * 12;
//     }
//   }
  
//   // Calculate interest for the period
//   const interest = totalPrincipal * monthlyRate * tenureMonths;
//   const totalAmount = totalPrincipal + interest;
  
//   // Format date for returns (using date in the future based on tenure)
//   const currentDate = new Date();
//   const futureDate = new Date();
//   futureDate.setMonth(currentDate.getMonth() + tenureMonths);
  
//   const formattedDate = `${futureDate.getDate()} ${futureDate.toLocaleString('default', { month: 'short' })} ${futureDate.getFullYear()}`;
  
//   // Create returns data structure to match the screenshot format
//   const returnsData = [
//     {
//       date: formattedDate,
//       principal: totalPrincipal.toFixed(2),
//       interest: interest.toFixed(2),
//       totalAmount: totalAmount.toFixed(2)
//     }
//   ];
  
//   return {
//     returnsData,
//     summary: {
//       totalPrincipal: totalPrincipal.toFixed(2),
//       totalInterest: interest.toFixed(2),
//       totalAmount: totalAmount.toFixed(2)
//     },
//     ytm: plan.apy, // Yield to Maturity
//     riskLevel: plan.riskLevel,
//     tenureMonths
//   };
// };


// const generateReturnsPDF = (plan, units, returnsData) => {
//   return new Promise((resolve, reject) => {
//     try {
//       // Create a new PDF document
//       const doc = new PDFDocument({
//         margin: 50,
//         size: 'A4'
//       });
      
//       // Buffer to store PDF
//       const buffers = [];
//       doc.on('data', buffer => buffers.push(buffer));
//       doc.on('end', () => resolve(Buffer.concat(buffers)));
      
//       // Add content to PDF
//       doc.fontSize(20).text('Investment Returns Visualization', { align: 'center' });
//       doc.moveDown();
      
//       // Plan details
//       doc.fontSize(14).text('Plan Details', { underline: true });
//       doc.fontSize(12).text(`Plan Name: ${plan.name || 'UGRO Capital Senior Secured Bond'}`);
//       doc.text(`Risk Level: ${plan.riskLevel || 'Low'}`);
//       doc.text(`YTM: ${plan.apy}%`);
//       doc.text(`Units Purchased: ${units}`);
//       doc.text(`Unit Price: ₹${plan.minInvestment.toFixed(2)}`);
//       doc.text(`Total Investment: ₹${returnsData.summary.totalPrincipal}`);
//       doc.moveDown();
      
//       // Returns table
//       doc.fontSize(14).text('Returns Schedule', { underline: true });
//       doc.moveDown(0.5);
      
//       // Table headers
//       const headers = ['#', 'Date', 'Principal (₹)', 'Interest (₹)', 'Total Amount (₹)'];
      
//       // Draw table headers
//       const tableTop = doc.y;
//       const tableLeft = 50;
//       const colWidth = (doc.page.width - 100) / headers.length;
      
//       doc.fontSize(10);
//       headers.forEach((header, i) => {
//         doc.text(header, tableLeft + i * colWidth, tableTop, { width: colWidth, align: 'center' });
//       });
      
//       const rowHeight = 20;
//       let rowTop = tableTop + rowHeight;
      
//       // Draw table rows
//       returnsData.returnsData.forEach((row, i) => {
//         doc.text((i + 1).toString(), tableLeft, rowTop, { width: colWidth, align: 'center' });
//         doc.text(row.date, tableLeft + colWidth, rowTop, { width: colWidth, align: 'center' });
//         doc.text(row.principal, tableLeft + 2 * colWidth, rowTop, { width: colWidth, align: 'center' });
//         doc.text(row.interest, tableLeft + 3 * colWidth, rowTop, { width: colWidth, align: 'center' });
//         doc.text(row.totalAmount, tableLeft + 4 * colWidth, rowTop, { width: colWidth, align: 'center' });
        
//         rowTop += rowHeight;
//       });
      
//       // Total row
//       doc.rect(tableLeft, rowTop, doc.page.width - 100, rowHeight).stroke();
//       doc.text('Total', tableLeft, rowTop, { width: colWidth, align: 'center' });
//       doc.text(`${returnsData.returnsData.length} Returns`, tableLeft + colWidth, rowTop, { width: colWidth, align: 'center' });
//       doc.text(returnsData.summary.totalPrincipal, tableLeft + 2 * colWidth, rowTop, { width: colWidth, align: 'center' });
//       doc.text(returnsData.summary.totalInterest, tableLeft + 3 * colWidth, rowTop, { width: colWidth, align: 'center' });
//       doc.text(returnsData.summary.totalAmount, tableLeft + 4 * colWidth, rowTop, { width: colWidth, align: 'center' });
      
//       // Summary and disclaimer
//       doc.moveDown(2);
//       doc.fontSize(12).text('Summary', { underline: true });
//       doc.fontSize(10).text(`Your investment of ₹${returnsData.summary.totalPrincipal} will yield a total return of ₹${returnsData.summary.totalAmount} in ${returnsData.tenureMonths} months, with an interest of ₹${returnsData.summary.totalInterest}.`);
      
//       doc.moveDown();
//       doc.fontSize(8).text('Disclaimer: Returns shown are indicative and subject to market conditions. Past performance is not indicative of future results.', { align: 'center', italic: true });
      
//       // Finalize the PDF
//       doc.end();
      
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

// /**
//  * API endpoint to get visual returns
//  */
// router.get('/visualise-returns/:planId/:units', async (req, res) => {
//   try {
//     const { planId, units = 1 } = req.params;
//       console.log("planid"+" "+planId+" "+units);
//     if (!planId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Plan ID is required'
//       });
//     }
    
//     // Convert units to number
//     const numberOfUnits = parseInt(units);
    
//     if (isNaN(numberOfUnits) || numberOfUnits <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid number of units'
//       });
//     }
    
//     // Find plan from database
//     const plan = await Plan.findById(planId);
    
//     if (!plan) {
//       return res.status(404).json({
//         success: false,
//         message: 'Plan not found'
//       });
//     }
    
//     // Calculate returns
//     const returnsData = calculateReturns(plan, numberOfUnits);
    
//     return res.status(200).json({
//       success: true,
//       data: {
//         planDetails: {
//           name: plan.name || 'UGRO Capital Senior Secured Bond',
//           type: plan.type,
//           apy: plan.apy,
//           riskLevel: plan.riskLevel
//         },
//         units: numberOfUnits,
//         unitPrice: plan.minInvestment,
//         totalInvestment: returnsData.summary.totalPrincipal,
//         returnsData: returnsData.returnsData,
//         summary: returnsData.summary
//       }
//     });
    
//   } catch (error) {
//     console.error('Error getting visual returns:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error calculating returns',
//       error: error.message
//     });
//   }
// });

// /**
//  * API endpoint to generate and download returns PDF
//  */
// router.get('/download-returns-pdf/:planId/:units', async (req, res) => {
//   try {
//     const { planId, units = 1 } = req.params;
    
//     if (!planId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Plan ID is required'
//       });
//     }
    
//     // Convert units to number
//     const numberOfUnits = parseInt(units);
    
//     if (isNaN(numberOfUnits) || numberOfUnits <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid number of units'
//       });
//     }
    
//     // Find plan from database
//     const plan = await Plan.findById(planId);
    
//     if (!plan) {
//       return res.status(404).json({
//         success: false,
//         message: 'Plan not found'
//       });
//     }
    
//     // Calculate returns
//     const returnsData = calculateReturns(plan, numberOfUnits);
    
//     // Generate PDF
//     const pdfBuffer = await generateReturnsPDF(plan, numberOfUnits, returnsData);
    
//     // Set response headers for PDF download
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename=returns-plan-${planId}.pdf`);
    
//     // Send PDF buffer as response
//     return res.send(pdfBuffer);
    
//   } catch (error) {
//     console.error('Error generating returns PDF:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error generating returns PDF',
//       error: error.message
//     });
//   }
// });
module.exports = router;
