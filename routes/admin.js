

const express = require('express');
const nodemailer = require("nodemailer");
const { uploadToCloudinary } = require("../utils/cloudinary");
const jwt = require('jsonwebtoken');

const dotenv = require('dotenv');
const mongoose = require("mongoose");
const Investment = require('../models/Investment'); 
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ADMIN_EMAIL = "sunidhi@gmail.com";
const ADMIN_PHONE = "1234567890"; // Optional
const ADMIN_OTP = "0000";
const { protect, adminOnly } = require('../middlewares/authMiddlewares');
const JWT_SECRET = process.env.JWT_SECRET || "Apple";
const Plan = require('../models/Plan'); 
const FAQ = require("../models/FAQ"); // Import the FAQ model
const Reward = require('../models/Rewards');
const PaymentRequest = require('../models/Payments');
const { body, validationResult } = require('express-validator');
const multer = require("multer");
const storage = multer.memoryStorage();
const Category = require('../models/Category'); // Import Category model
const PDFDocument = require("pdfkit");
const upload = multer({ storage: storage });
dotenv.config();
const router = express.Router();
const Quiz = require('../models/Quiz');
const fs = require("fs");
const path = require("path");
const downloadsDir = path.join(__dirname, "../downloads");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true }); // Creates folder if missing
}
// Admin Login (Dynamically Generated OTP)
const transporter = nodemailer.createTransport({ 
    service: 'gmail', // Use your email provider
    auth: {
      user: process.env.EMAIL_USER, // Admin email (set in environment variables)
      pass: process.env.EMAIL_PASS // Admin email password (use env variables for security)
    }
  });
// // Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ msg: 'Access Denied. No Token Provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ msg: 'Unauthorized access' });
        }
        req.admin = decoded;
        next();
    } catch (err) {
        res.status(400).json({ msg: 'Invalid Token' });
    }
};
router.post('/login', (req, res) => {
  
    const { email, phone } = req.body;

    if (email !== ADMIN_EMAIL && phone !== ADMIN_PHONE) {
        return res.status(400).json({ msg: 'Unauthorized access' });
    }

    res.json({ msg: 'OTP sent (0000 for now)', otp: ADMIN_OTP });
});
router.post('/verify-login-otp', (req, res) => {
    const { email, phone, otp } = req.body;

    if (email !== ADMIN_EMAIL || phone !== ADMIN_PHONE || otp !== ADMIN_OTP) {
        return res.status(400).json({ msg: 'Invalid email/phone or OTP' });
    }

    // Generate JWT token with correct email
    const token = jwt.sign({ adminId: "hardcoded_admin_id", role: 'admin', email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ msg: 'Admin login successful', token });
});
// 3️⃣ **Middleware to Verify Admin Token**
// // Admin Dashboard Overview
// router.get('/dashboard', protect, adminOnly, async (req, res) => {
//     try {
//         const totalInvestments = await Investment.aggregate([{ $group: { _id: "$planName", total: { $sum: "$amount" } } }]);
//         const totalUsers = await User.countDocuments({ role: "user" });

//         res.json({ 
//             message: 'Admin Dashboard', 
//             totalInvestments, 
//             totalUsers 
//         });

//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });
// ✅ Get Investment Stats (Without User Data Exposure)
router.get('/investment-stats', protect, adminOnly, async (req, res) => {
    try {
        const investments = await Investment.aggregate([
            { $group: { _id: "$planName", totalInvested: { $sum: "$amount" }, totalUsers: { $sum: 1 } } }
        ]);

        res.json({ success: true, investments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ✅ Get Withdrawal Stats (Without User Data Exposure)
router.get('/withdrawal-stats', protect, adminOnly, async (req, res) => {
    try {
        const withdrawals = await Transaction.aggregate([
            { $match: { type: "withdrawal" } },
            { $group: { _id: "$paymentMethod", totalWithdrawn: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);

        res.json({ success: true, withdrawals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// router.put('/kyc-approve/:userId', protect, adminOnly, async (req, res) => {
//     try {
//         const { status, reason } = req.body;

//         if (!['verified', 'rejected'].includes(status)) {
//             return res.status(400).json({ message: "Invalid status" });
//         }

//         const user = await User.findByIdAndUpdate(req.params.userId, { kycStatus: status }, { new: true });
//         if (!user) return res.status(404).json({ message: "User not found" });

//         // Email content
//         let subject, text;
//         if (status === 'verified') {
//             subject = "KYC Approved ✅";
//             text = `Dear ${user.email},\n\nYour KYC has been successfully approved! You can now access all platform features.\n\nBest Regards,\nYour Company`;
//         } else {
//             subject = "KYC Rejected ❌";
//             text = `Dear ${user.email},\n\nUnfortunately, your KYC has been rejected for the following reason: ${reason || "Not specified"}.\nPlease re-submit your documents.\n\nBest Regards,\nYour Company`;
//         }

//         // Send Email Notification
//         await transporter.sendMail({
//             from: process.env.EMAIL_USER,
//             to: user.email,
//             subject,
//             text,
//         });

//         res.json({ success: true, message: `KYC ${status} and email sent` });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });
router.put('/approve/:id', protect, async (req, res) => {

    try {
        const { id } = req.params;
        const { adminNotes } = req.body;
        //  const { status, reason } = req.body;
        // Find the payment request
        const paymentRequest = await PaymentRequest.findById(id).populate('user');
  
        if (!paymentRequest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Payment request not found' 
            });
        }
  
        // Check if it's already approved or rejected
        if (paymentRequest.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment request is already processed' 
            });
        }
  
        // Approve the request
        paymentRequest.status = 'approved';
        paymentRequest.adminId = req.user._id; // Assuming req.user is the admin
        paymentRequest.adminNotes = adminNotes || '';
        await paymentRequest.save();
  
        // Add funds to user's wallet
        const user = await User.findById(paymentRequest.user._id);
        user.walletBalance += paymentRequest.amount;
        await user.save();
  
        res.status(200).json({
            success: true,
            message: 'Payment request approved, funds added to wallet',
            data: paymentRequest
        });
  
    } catch (error) {
        console.error('Error approving payment request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error approving payment request',
            error: error.message 
        });
    }
  });
router.post(
    "/plans",
    protect,
    adminOnly,
    upload.single("plansImage"), // Allow up to 5 images
    async (req, res) => {
      try {
       
        const {
          name,
          type,
          category,
          description,
          reasonToInvest,
          principal,
          keyStrength,
          apy,
    
          tenureOptions,
          paymentShield,
          minInvestment,
          maxInvestment,
          dividend,
          reward,
          paymentOptions,
          riskLevel,
          dealHighlights,
          aboutIssuer
        } = req.body;
       

         console.log("this is name "+ name);
         console.log("this is type "+ type);
         console.log("this is cat "+ category);
         console.log("this is des "+ description);
         console.log("this is apy "+ apy);
         console.log("this is tenure "+ tenureOptions);
         console.log("this is min "+ minInvestment);
         console.log("this is max "+ maxInvestment);
         console.log("this is dividend "+ dividend);
         console.log("this is risklevel "+ riskLevel);

        if (!name || !type || !category || !description || !apy || !tenureOptions || !minInvestment || !maxInvestment || !dividend || !riskLevel) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        // if (!type) {
        //     return res.status(400).json({ message: "Type is missing from the request." });
        //   }
      console.log(req.file);
        // Process image uploads
        // let planImages = [];
        // abh smjh aya let or var ka diff 
        if (req.file) {
              const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
              var plansImageUrl = await uploadToCloudinary(base64, "plansImage", req.file.mimetype);
          console.log(plansImageUrl)
        }
  
        const highlights = dealHighlights || {
          apy: apy || 0,
          paymentShield: paymentShield?.isAvailable || false,
          minInvestment: minInvestment || 0,
          maturityDate: null,
          reward: reward || "No reward",
          dividend: dividend || 0,
        };
     
  
        // const newPlan = new Plan({
        //   name,
        //   type,
        //   category,
        //   description,
        //   reasonToInvest,
        //   principal,
        //   keyStrength,
        //   apy,
        //   tenureOptions,
        //   paymentShield,
        //   minInvestment,
        //   maxInvestment,
        //   dividend,
        //   reward,
        //   paymentOptions,
        //   riskLevel,
        //   aboutIssuer,
        //   dealHighlights: highlights,
        //   planImages: plansImageUrl, // Store image URLs in the database
        // });
        const newPlan = new Plan({
            name,
            type,
            category,
            description,
            aboutIssuer: Array.isArray(aboutIssuer)
              ? aboutIssuer
              : aboutIssuer.split(".."), // Convert comma-separated strings to array
            keyStrength: Array.isArray(keyStrength)
              ? keyStrength
              : keyStrength.split(".."),
            reasonToInvest: Array.isArray(reasonToInvest)
              ? reasonToInvest
              : reasonToInvest.split(".."),
            apy,
            tenureOptions,
            paymentShield,
            minInvestment,
            maxInvestment,
            dividend,
            reward,
            paymentOptions,
            riskLevel,
            dealHighlights: highlights,
            planImages: plansImageUrl,
          });
  
        await newPlan.save();
  
        res.status(201).json({ success: true, plan: newPlan });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  router.get("/download/pdf/:planId", async (req, res) => {
    try {
      const { planId } = req.params;
      const plan = await Plan.findById(planId);
  
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
  
      // Ensure downloads directory exists
      const downloadsDir = path.join(__dirname, "../downloads");
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true }); // Create folder if it doesn't exist
      }
  
      // Define PDF path
      const pdfPath = path.join(downloadsDir, `plan_${planId}.pdf`);
      const stream = fs.createWriteStream(pdfPath);
  
      // Create a new PDF document
      const doc = new PDFDocument();
      doc.pipe(stream);
  
      // Add title
      doc.fontSize(20).text(`Plan Details: ${plan.name}`, { align: "center" });
      doc.moveDown();
  
      // Plan details
      doc.fontSize(16).text(`Type: ${plan.type}`);
      doc.text(`Category: ${plan.category}`);
      doc.text(`Description: ${plan.description}`);
      doc.text(`APY: ${plan.apy}%`);
      doc.text(`Minimum Investment: $${plan.minInvestment}`);
      doc.text(`Maximum Investment: $${plan.maxInvestment}`);
      doc.text(`Risk Level: ${plan.riskLevel}`);
      doc.text(`Dividend: ${plan.dividend}`);
      doc.moveDown();
  
      // Convert arrays to readable format
      doc.fontSize(12).text(`🔹 About Issuer: ${plan.aboutIssuer.join(", ")}`);
      doc.text(`🔹 Key Strengths: ${plan.keyStrength.join(", ")}`);
      doc.text(`🔹 Reasons to Invest: ${plan.reasonToInvest.join(", ")}`);
  
      doc.moveDown();
      doc.end();
  
      // Wait for PDF to be created and send it as a response
      stream.on("finish", () => {
        res.download(pdfPath, `Plan_${plan.name}.pdf`, (err) => {
          if (err) {
            console.error("Error downloading file:", err);
            res.status(500).json({ error: "Error downloading file" });
          }
        });
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: error.message });
    }
  });
//   router.post('/plans', protect, adminOnly, async (req, res) => {
//     try {
//         const { 
//             name, 
//             type, 
//             category, 
//             description, 
//             apy, 
//             tenureOptions, 
//             paymentShield, 
//             minInvestment, 
//             maxInvestment, 
//             dividend, 
//             reward, 
//             paymentOptions, 
//             riskLevel,
//             dealHighlights  // ✅ Now included
//         } = req.body;

//         // Validate required fields
//         if (!name || !type || !category || !description || !apy || !tenureOptions || !minInvestment || !maxInvestment || !dividend || !riskLevel) {
//             return res.status(400).json({ message: "Missing required fields" });
//         }

//         // Validate category
//         const validCategories = ['low_risk', 'tax_saving', 'sip', 'high_yield', 'blockchain_funds'];
//         if (!validCategories.includes(category)) {
//             return res.status(400).json({ message: "Invalid category" });
//         }

//         // Ensure dealHighlights is properly structured
//         const highlights = dealHighlights || {
//             apy: apy || 0,
//             paymentShield: paymentShield?.isAvailable || false,
//             minInvestment: minInvestment || 0,
//             maturityDate: null,
//             reward: reward || "No reward",
//             dividend: dividend || 0
//         };

//         // Create new investment plan
//         const newPlan = new Plan({
//             name,
//             type,
//             category,
//             description,
//             apy,
//             tenureOptions,
//             paymentShield,
//             minInvestment,
//             maxInvestment,
//             dividend,
//             reward,
//             paymentOptions,
//             riskLevel,
//             dealHighlights: highlights // ✅ Now always included
//         });

//         await newPlan.save();

//         res.status(201).json({ success: true, plan: newPlan });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

router.get('/plans', protect, adminOnly, async (req, res) => {
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
router.get('/plans/category/:category', protect, adminOnly, async (req, res) => {
    try {
        const { category } = req.params;

        // Fetch plans by category
        const plans = await Plan.find({ category });

        if (plans.length === 0) {
            return res.status(404).json({ msg: 'No plans found for this category' });
        }

        res.json({ success: true, plans });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put('/plans/:id', protect, adminOnly, async (req, res) => {
    try {
        const planId = req.params.id;
        const updates = req.body;

        const updatedPlan = await Plan.findByIdAndUpdate(planId, updates, { new: true });

        if (!updatedPlan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        res.json({ success: true, message: "Plan updated successfully", plan: updatedPlan });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/plans/:id', protect, adminOnly, async (req, res) => {
    try {
        const planId = req.params.id;

        // Check if any user has invested in this plan
        const investments = await Investment.findOne({ plan: planId });

        if (investments) {
            return res.status(400).json({ message: "Cannot delete plan with active investments" });
        }

        const deletedPlan = await Plan.findByIdAndDelete(planId);

        if (!deletedPlan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        res.json({ success: true, message: "Plan deleted successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch('/plans/:id/deactivate', protect, adminOnly, async (req, res) => {
    try {
        const planId = req.params.id;

        // Find the plan and update `isActive` to false
        const updatedPlan = await Plan.findByIdAndUpdate(planId, { isActive: false }, { new: true });

        if (!updatedPlan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        res.json({ success: true, message: "Plan deactivated successfully", plan: updatedPlan });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// withdraws 
const Withdrawal = require('../models/Withdrawal'); // Create this model if not available
router.post('/process-withdrawals', protect, adminOnly, async (req, res) => {
    try {
        // Fetch all pending withdrawals
        const pendingWithdrawals = await Withdrawal.find({ status: "pending" }).populate("user");

        if (pendingWithdrawals.length === 0) {
            return res.json({ message: "No pending withdrawals" });
        }

        let processedWithdrawals = [];

        for (let withdrawal of pendingWithdrawals) {
            const user = withdrawal.user;

            // Check if user's KYC is approved
            if (user.kycStatus !== "verified") {
                withdrawal.status = "failed";
                withdrawal.remarks = "KYC not verified";
                await withdrawal.save();
                continue;
            }

            // Check if the user has enough balance
            if (user.walletBalance < withdrawal.amount) {
                withdrawal.status = "failed";
                withdrawal.remarks = "Insufficient balance";
                await withdrawal.save();
                continue;
            }


            // Deduct balance and process withdrawal
            user.walletBalance -= withdrawal.amount;
            withdrawal.status = "processed";
            await user.save();
            await withdrawal.save();

            processedWithdrawals.push({
                user: user.email,
                amount: withdrawal.amount,
                method: withdrawal.paymentMethod,
                status: withdrawal.status
            });
        }

        res.json({ success: true, processedWithdrawals });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put("/kyc/:userId", protect, async (req, res) => {
    console.log(req.params.userId)
    try {
      
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
      }
  
      const { status } = req.body; // status = 'verified' or 'rejected'
      if (!["verified", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
  
      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
  
      user.kycStatus = status;
      await user.save();
  
      res.status(200).json({ success: true, message: `KYC ${status} successfully.` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
 
router.get('/transactions', protect, adminOnly, async (req, res) => {
    try {
        let { type, status, sort = '-createdAt' } = req.query;
        let query = {};

        if (type) query.type = type; // Filter by deposit, withdrawal, etc.
        if (status) query.status = status; // Filter by success, failed, pending

        const transactions = await Transaction.find(query)
            .populate('user', 'email username')
            .sort(sort);

        res.json({ success: true, transactions });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/login-logs', protect, adminOnly, async (req, res) => {
    try {
        const logs = await AdminLog.find().sort('-createdAt');
        res.json({ success: true, logs });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post("/faq", protect, adminOnly, async (req, res) => {
    try {
        const { question, answer } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ message: "Both question and answer are required." });
        }

        const newFAQ = new FAQ({ question, answer });
        await newFAQ.save();

        res.status(201).json({ success: true, message: "FAQ added successfully", faq: newFAQ });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ✅ User: Get all FAQs
router.get("/faq", async (req, res) => {
    try {
        const faqs = await FAQ.find().sort({ createdAt: -1 });
        res.json({ success: true, faqs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// get only referals related questions 
// ✅ User: Get only referral-related FAQs
router.get("/faq/referral", async (req, res) => {
    try {
        const referralFAQs = await FAQ.find({ question: { $regex: /refer/i } }).sort({ createdAt: -1 });

        res.json({ success: true, faqs: referralFAQs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ✅ Admin: Delete an FAQ
router.delete("/faq/:id", protect, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedFAQ = await FAQ.findByIdAndDelete(id);

        if (!deletedFAQ) {
            return res.status(404).json({ message: "FAQ not found." });
        }

        res.json({ success: true, message: "FAQ deleted successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// rewards functionality 
// Create or update a reward
router.post('/add-reward',protect, async (req, res) => {
    try {
        const { amountRequired, rewardName, description } = req.body;

        // Check if reward already exists for this amount
        const existingReward = await Reward.findOne({ amountRequired });
        if (existingReward) {
            return res.status(400).json({ message: 'Reward for this amount already exists.' });
        }

        const reward = new Reward({ amountRequired, rewardName, description });
        await reward.save();
        
        res.status(201).json({ message: 'Reward added successfully', reward });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
  // Get all rewards
router.get('/rewards-all',protect, async (req, res) => {
    try {
      const rewards = await Reward.find();
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ message: "Server Error", error });
    }
  });
  // Delete a reward
router.delete('/delete/:id',protect, async (req, res) => {
    try {
      await Reward.findByIdAndDelete(req.params.id);
      res.json({ message: "Reward deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server Error", error });
    }
  });
  // admin quiz 
router.post('/add', protect, async (req, res) => {
    try {
      const { question, options, correctAnswer } = req.body;
      const adminId = req.user._id; // Get admin ID from token
  
      if (!question || !options || !correctAnswer || options.length < 2) {
        return res.status(400).json({ message: 'Invalid quiz data' });
      }
  
      const newQuiz = new Quiz({
        question,
        options,
        correctAnswer,
        createdBy: adminId
      });
  
      await newQuiz.save();
      res.status(201).json({ message: 'Quiz added successfully' });
  
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
router.put('/admin/approve/:id', protect, adminOnly, async (req, res) => {
    try {
        const { status, adminNotes } = req.body;

        // Validate status
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Use "approved" or "rejected".' });
        }

        // Find payment request
        const paymentRequest = await PaymentRequest.findById(req.params.id).populate('user', 'email username walletBalance');
        if (!paymentRequest) {
            return res.status(404).json({ success: false, message: 'Payment request not found' });
        }

        // Prevent duplicate approval/rejection
        if (paymentRequest.status === 'approved' || paymentRequest.status === 'rejected') {
            return res.status(400).json({ success: false, message: `This request is already ${paymentRequest.status}` });
        }

        const user = paymentRequest.user;

        // If rejected, ensure a reason is provided
        if (status === 'rejected' && !adminNotes) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
        }

        // If approved, add the amount to the user's wallet
        if (status === 'approved') {
            user.walletBalance += paymentRequest.amount;
            await user.save();
        }

        // Update payment request status
        paymentRequest.status = status;
        paymentRequest.adminNotes = adminNotes || '';
        paymentRequest.adminId = req.user._id;
        await paymentRequest.save();

        // Send email notification
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Payment Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
            html: `
                <h2>Payment Request ${status === 'approved' ? 'Approved' : 'Rejected'}</h2>
                <p>Dear ${user.username},</p>
                <p>Your payment request has been <strong>${status}</strong>.</p>
                <ul>
                    <li><strong>Transaction ID:</strong> ${paymentRequest.transactionId}</li>
                    <li><strong>Amount:</strong> ₹${paymentRequest.amount}</li>
                    <li><strong>Bank Name:</strong> ${paymentRequest.bankName}</li>
                    ${status === 'rejected' ? `<li><strong>Rejection Reason:</strong> ${adminNotes}</li>` : ''}
                </ul>
                <p>${status === 'approved' ? 'Your wallet has been credited successfully.' : 'Please review the reason and try again.'}</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            success: true,
            message: `Payment request ${status} successfully.`,
            data: paymentRequest
        });

    } catch (error) {
        console.error('Error updating payment request:', error);
        res.status(500).json({ success: false, message: 'Error updating payment request', error: error.message });
    }
});
router.get('/withdrawals',protect,async (req, res) => {
    try {
        const withdrawals = await PaymentRequest.find().populate('user', 'username email');
        res.status(200).json(withdrawals);
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.put('/admin/withdraws/:id', protect, adminOnly, async (req, res) => {
    try {
        const { status, adminNotes } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Use "approved" or "rejected".' });
        }

        const paymentRequest = await PaymentRequest.findById(req.params.id).populate('user', 'email username walletBalance');
        if (!paymentRequest) {
            return res.status(404).json({ success: false, message: 'Payment request not found' });
        }

        if (paymentRequest.status !== 'pending') {
            return res.status(400).json({ success: false, message: `This request is already ${paymentRequest.status}` });
        }

        const user = paymentRequest.user;

        if (status === 'rejected' && !adminNotes) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
        }

        // ✅ Deduct balance only when approved
        if (status === 'approved') {
            if (user.walletBalance < paymentRequest.amount) {
                return res.status(400).json({ success: false, message: 'User does not have enough balance.' });
            }

            user.walletBalance -= paymentRequest.amount; // Deduct balance
            await user.save();
        }

        paymentRequest.status = status;
        paymentRequest.adminNotes = adminNotes || '';
        paymentRequest.adminId = req.user._id;
        await paymentRequest.save();

        // Send email notification
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Withdrawal Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
            html: `
                <h2>Withdrawal Request ${status === 'approved' ? 'Approved' : 'Rejected'}</h2>
                <p>Dear ${user.username},</p>
                <p>Your withdrawal request has been <strong>${status}</strong>.</p>
                <ul>
                    <li><strong>Transaction ID:</strong> ${paymentRequest.transactionId}</li>
                    <li><strong>Amount:</strong> ₹${paymentRequest.amount}</li>
                    <li><strong>Bank Name:</strong> ${paymentRequest.bankName}</li>
                    ${status === 'rejected' ? `<li><strong>Rejection Reason:</strong> ${adminNotes}</li>` : ''}
                </ul>
                <p>${status === 'approved' ? 'Your bank transfer is being processed.' : 'Please review the reason and try again.'}</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            success: true,
            message: `Withdrawal request ${status} successfully.`,
            data: paymentRequest
        });

    } catch (error) {
        console.error('Error updating withdrawal request:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});
// my final 
router.put('/admin/approve-withdraws/:id', protect, adminOnly, async (req, res) => {
    try {
        const { status, adminNotes } = req.body;

        // Validate status
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Use "approved" or "rejected".' });
        }

        // Find withdrawal request
        const { id } = req.params;
        const withdrawalRequest = await PaymentRequest.findOne({ transactionId: id }).populate('user', 'email username walletBalance');
        if (!withdrawalRequest) {
            return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
        }

        // Prevent duplicate approval/rejection
        if (withdrawalRequest.status !== 'pending') {
            return res.status(400).json({ success: false, message: `This request is already ${withdrawalRequest.status}` });
        }

        const user = withdrawalRequest.user;

        // If rejected, ensure a reason is provided
        if (status === 'rejected' && !adminNotes) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
        }

        // If approved, deduct the amount from the user's wallet
        if (status === 'approved') {
            if (user.walletBalance < withdrawalRequest.amount) {
                return res.status(400).json({ success: false, message: 'Insufficient balance in user account.' });
            }
            user.walletBalance -= withdrawalRequest.amount;
            await user.save();
        }

        // Update withdrawal request status
        withdrawalRequest.status = status;
        withdrawalRequest.adminNotes = adminNotes || '';
        withdrawalRequest.adminId = req.user._id;
        await withdrawalRequest.save();

        // Send email notification
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Withdrawal Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
            html: `
                <h2>Withdrawal Request ${status === 'approved' ? 'Approved' : 'Rejected'}</h2>
                <p>Dear ${user.username},</p>
                <p>Your withdrawal request has been <strong>${status}</strong>.</p>
                <ul>
                    <li><strong>Transaction ID:</strong> ${withdrawalRequest.transactionId}</li>
                    <li><strong>Amount:</strong> ₹${withdrawalRequest.amount}</li>
                    <li><strong>Bank Name:</strong> ${withdrawalRequest.bankName}</li>
                    ${status === 'rejected' ? `<li><strong>Rejection Reason:</strong> ${adminNotes}</li>` : ''}
                </ul>
                <p>${status === 'approved' ? 'The amount has been deducted from your wallet and will be processed soon.' : 'Please review the reason and try again.'}</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({
            success: true,
            message: `Withdrawal request ${status} successfully.`,
            data: withdrawalRequest
        });
    } catch (error) {
        console.error('Error updating withdrawal request:', error);
        res.status(500).json({ success: false, message: 'Error updating withdrawal request', error: error.message });
    }
});
// retrieiving the total number of users 
router.get('/total-users', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        res.status(200).json({ totalUsers });
    } catch (error) {
        console.error('Error fetching total users:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
  // retierivng  total investments of the users 
  router.get('/total-investment', async (req, res) => {
    try {
        // Sum of all investments
        const totalInvestment = await Investment.aggregate([
            { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
        ]);

        res.status(200).json({
            totalInvestment: totalInvestment.length > 0 ? totalInvestment[0].totalAmount : 0
        });
    } catch (error) {
        console.error('Error fetching total investment amount:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// top investors according to the amount he invested 
router.get('/top-investor', async (req, res) => {
    try {
        // Find the user with the highest total investment
        const topInvestor = await User.findOne().sort({ totalInvestment: -1 }).select('email totalInvestment');

        if (!topInvestor) {
            return res.status(404).json({ message: "No investors found" });
        }

        res.status(200).json({
            topInvestor: {
                email: topInvestor.email,
                totalInvestment: topInvestor.totalInvestment
            }
        });
    } catch (error) {
        console.error('Error fetching top investor:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
// router.get('/plans/count/:category', async (req, res) => {
//     try {
//       const category = req.params.category;
  
//       // Check if the category is valid
//       const validCategories = ['low_risk', 'tax_saving', 'AI_funds', 'high_yield', 'blockchain_funds', 'SIP'];
//       if (!validCategories.includes(category)) {
//         return res.status(400).json({ message: "Invalid category" });
//       }
  
//       // Count the number of plans in the specified category
//       const planCount = await Plan.countDocuments({ category });
  
//       // Return the count of plans
//       res.status(200).json({ category, totalPlans: planCount });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Server error' });
//     }
//   });
// API to get the count of plans in each category
// router.get("/plans/category-count", async (req, res) => {
//     try {
//       const categoryCounts = await Plan.aggregate([
//         {
//           $group: {
//             _id: "$category", // Group by category
//             totalPlans: { $sum: 1 } // Count the number of plans per category
//           }
//         }
//       ]);
  
//       // Formatting response as "category count - number"
//     //   const formattedResponse = categoryCounts.map(category => ({
//     //     category: `${category._id} count - ${category.totalPlans}`
//     //   }));
//     const formattedResponse = categoryCounts.map(category => ({
//         category: `${category._id.replace(/_/g, " ")} ${category.totalPlans}`
//       }));
  
//       res.status(200).json(formattedResponse);
//     } catch (error) {
//       console.error("Error fetching category counts:", error);
//       res.status(500).json({ error: "Server error" });
//     }
//   });
router.get("/plans/category-count", async (req, res) => {
    try {
      const categoryCounts = await Plan.aggregate([
        {
          $group: {
            _id: "$category", // Group by category
            totalPlans: { $sum: 1 } // Count the number of plans per category
          }
        }
      ]);
  
      // Formatting response
      const formattedResponse = categoryCounts.map(category => ({
        name: category._id.replace(/_/g, " "), // Format category name
        count: category.totalPlans
      }));
  
      res.status(200).json(formattedResponse);
    } catch (error) {
      console.error("Error fetching category counts:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  
module.exports = router;
// admin token : 
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiaGFyZGNvZGVkX2FkbWluX2lkIiwicm9sZSI6ImFkbWluIiwiZW1haWwiOiJzdW5pZGhpQGdtYWlsLmNvbSIsImlhdCI6MTc0MzA3NjYzNCwiZXhwIjoxNzQzMTYzMDM0fQ.N7FO_29SMbQgdSU7Ac9VukR6p5tTT9fGPAjLQM9ooq4