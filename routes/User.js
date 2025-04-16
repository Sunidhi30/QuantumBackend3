const express = require("express");
const router = express.Router();
const Plan = require("../models/Plan"); // Import Plan model
const { protect } = require("../middlewares/authMiddlewares"); // Only authentication required
const User = require("../models/User"); // Ensure correct path
const { uploadToCloudinary } = require("../utils/cloudinary");
const {uploadsCloudinary}= require("../utils/cloudinary");
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
// PUT: Update profile with optional image upload

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
// router.post(
//   "/kyc",
//   protect,
//   upload.fields([{ name: "idProof", maxCount: 1 }]), // Aadhaar or Passport
//   async (req, res) => {
//     try {
//       const user = await User.findById(req.user.id);
//       if (!user) return res.status(404).json({ message: "User not found" });

//       const { nationality, idNumber } = req.body;
//       if (!nationality || !idNumber) {
//         return res.status(400).json({ message: "Nationality and ID number are required" });
//       }

//       if (!req.files || !req.files.idProof) {
//         return res.status(400).json({ message: "ID Proof document is required" });
//       }

//       if (nationality === "Indian") {
//         if (!/^\d{12}$/.test(idNumber)) {
//           return res.status(400).json({ message: "Aadhaar number must be 12 digits" });
//         }
//       } else {
//         if (!/^[A-Z0-9]+$/.test(idNumber)) {
//           return res.status(400).json({ message: "Invalid passport number format" });
//         }
//       }

//       // Upload ID Proof to Cloudinary
//       const idProofUrl = await uploadsCloudinary(
//         req.files.idProof[0].buffer,
//         "kyc_docs",
//         req.files.idProof[0].mimetype
//       );

//       // Ensure kycDocuments exists and update it
//       if (!user.kycDocuments) {
//         user.kycDocuments = {};
//       }
//       user.kycDocuments.idProof = idProofUrl;
//       user.kycDocuments.idNumber = Number(idNumber); // Convert to Number to match schema

//       console.log("Before saving:", user.kycDocuments);
//       user.kycStatus = "pending";
//       await user.save();
//       console.log("After saving:", user.kycDocuments);
//      console.log("", user.kycDocuments )
//       res.status(200).json({
//         userId: req.user.id,
//         success: true,
//         message: "KYC submitted successfully. Waiting for admin approval.",
//         idproof : user.kycDocuments.idProof,
//         // urls: user.kycDocuments,
//       });
//     } catch (error) {
//       console.error("KYC Upload Error:", error);
//       res.status(500).json({ error: error.message });
//     }
//   }
// );
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

      if (nationality === "Indian") {
        if (!/^\d{12}$/.test(idNumber)) {
          return res.status(400).json({ message: "Aadhaar number must be 12 digits" });
        }
      } else {
        if (!/^[A-Z0-9]+$/.test(idNumber)) {
          return res.status(400).json({ message: "Invalid passport number format" });
        }
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
      user.kycDocuments.idNumber = Number(idNumber); // Convert to Number to match schema

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
// invest now options clicked api for that
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
// get investments according to the user 
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
// download the investments according to the units
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
    const downloadDir = path.join(__dirname, '../downloads');
    const pdfFilePath = path.join(downloadDir, pdfFileName);

    // Ensure the downloads directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // 🔹 Create PDF
    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
    const writeStream = fs.createWriteStream(pdfFilePath);
    doc.pipe(writeStream);

    // 🔹 PDF Title
    doc.fontSize(16).text('Investment Schedule', { align: 'center' }).moveDown();

    // 🔹 Define Column Headers & Data
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
    const pdfFileName = `investment_schedule_${investmentId}.pdf`;
    const pdfFilePath = path.join(__dirname, '../downloads', pdfFileName);

    if (!fs.existsSync(pdfFilePath)) {
      return res.status(404).json({ success: false, message: "PDF not found. Please generate it first." });
    }

    res.download(pdfFilePath, pdfFileName, (err) => {
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
// faqs of the users 
router.get("/faq", async (req, res) => {
    try {
        const faqs = await FAQ.find().sort({ createdAt: -1 });
        res.json({ success: true, faqs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// rewards users can see 
router.get('rewards', async (req, res) => {
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

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      request: withdrawalRequest
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});
// transactions history of the user
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
       console.log(transactions)
        res.status(200).json({ success: true, transactions });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// get all the cateoggies (low risk , high yeild )
router.get('/categories', async (req, res) => {
  try {
    const categories = await Plan.distinct('category'); // Get unique category values
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});
// sell the investment 
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
module.exports = router;
