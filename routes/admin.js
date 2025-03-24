

const express = require('express');

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

dotenv.config();
const router = express.Router();

// Admin Login (Dynamically Generated OTP)

    
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

// 2️⃣ **Verify Admin OTP & Issue Token**
// router.post('/verify-login-otp', (req, res) => {
//     const { email, phone, otp } = req.body;

//     if (email !== ADMIN_EMAIL || phone !== ADMIN_PHONE || otp !== ADMIN_OTP) {
//         return res.status(400).json({ msg: 'Invalid email/phone or OTP' });
//     }

//     // Generate JWT token
//     const token = jwt.sign({ role: 'admin', email }, JWT_SECRET, { expiresIn: '24h' });

//     res.json({ msg: 'Admin login successful', token });
// });
// router.post('/verify-login-otp', (req, res) => {
//     const { email, phone, otp } = req.body;

//     if (email !== ADMIN_EMAIL || phone !== ADMIN_PHONE || otp !== ADMIN_OTP) {
//         return res.status(400).json({ msg: 'Invalid email/phone or OTP' });
//     }

//     // Generate JWT token (Including fake adminId)
//     const token = jwt.sign({ adminId: "hardcoded_admin_id", role: 'admin', email }, JWT_SECRET, { expiresIn: '24h' });

//     res.json({ msg: 'Admin login successful', token });
// });
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

//

// // Admin Dashboard Overview
router.get('/dashboard', protect, adminOnly, async (req, res) => {
    try {
        const totalInvestments = await Investment.aggregate([{ $group: { _id: "$planName", total: { $sum: "$amount" } } }]);
        const totalUsers = await User.countDocuments({ role: "user" });

        res.json({ 
            message: 'Admin Dashboard', 
            totalInvestments, 
            totalUsers 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

// ✅ Get Pending KYC Requests
// router.get('/kyc-requests', protect, adminOnly, async (req, res) => {
//     try {
//         const users = await User.find({ kycStatus: "pending" }).select('kycDocuments username email');
//         res.json({ success: true, users });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });
// router.get('/kyc-requests', protect, adminOnly, async (req, res) => {
//     try {
//         const users = await User.find({ kycStatus: "pending" })
//             .select('username email kycDocuments.idProof kycDocuments.addressProof kycDocuments.selfie');

//         res.json({ success: true, users });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// ✅ Approve/Reject KYC (Admin Manually Verifies Documents)
router.put('/kyc-approve/:userId', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const user = await User.findByIdAndUpdate(req.params.userId, { kycStatus: status }, { new: true });
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ success: true, message: `KYC ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Manage Investment Plans

// ✅ Add New Investment Plan
// router.post('/plans', protect, adminOnly, async (req, res) => {
//     try {
//         const { 
//             name, 
//             type, 
//             description, 
//             apy, 
//             tenureOptions, 
//             paymentShield, 
//             minInvestment, 
//             maxInvestment, 
//             dividend, 
//             reward, 
//             paymentOptions, 
//             riskLevel 
//         } = req.body;

//         // Validate required fields
//         if (!name || !type || !description || !apy || !tenureOptions || !minInvestment || !maxInvestment || !dividend || !riskLevel) {
//             return res.status(400).json({ message: "Missing required fields" });
//         }

//         // Create new investment plan
//         const newPlan = new Plan({
//             name,
//             type,
//             description,
//             apy,
//             tenureOptions,
//             paymentShield,
//             minInvestment,
//             maxInvestment,
//             dividend,
//             reward,
//             paymentOptions,
//             riskLevel
//         });

//         await newPlan.save();

//         res.status(201).json({ success: true, plan: newPlan });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });
// router.post('/plans', protect, adminOnly, async (req, res) => {
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
//             riskLevel 
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
//             riskLevel
//         });

//         await newPlan.save();

//         res.status(201).json({ success: true, plan: newPlan });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });
router.post('/plans', protect, adminOnly, async (req, res) => {
    try {
        const { 
            name, 
            type, 
            category, 
            description, 
            apy, 
            tenureOptions, 
            paymentShield, 
            minInvestment, 
            maxInvestment, 
            dividend, 
            reward, 
            paymentOptions, 
            riskLevel,
            dealHighlights  // ✅ Now included
        } = req.body;

        // Validate required fields
        if (!name || !type || !category || !description || !apy || !tenureOptions || !minInvestment || !maxInvestment || !dividend || !riskLevel) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Validate category
        const validCategories = ['low_risk', 'tax_saving', 'sip', 'high_yield', 'blockchain_funds'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ message: "Invalid category" });
        }

        // Ensure dealHighlights is properly structured
        const highlights = dealHighlights || {
            apy: apy || 0,
            paymentShield: paymentShield?.isAvailable || false,
            minInvestment: minInvestment || 0,
            maturityDate: null,
            reward: reward || "No reward",
            dividend: dividend || 0
        };

        // Create new investment plan
        const newPlan = new Plan({
            name,
            type,
            category,
            description,
            apy,
            tenureOptions,
            paymentShield,
            minInvestment,
            maxInvestment,
            dividend,
            reward,
            paymentOptions,
            riskLevel,
            dealHighlights: highlights // ✅ Now always included
        });

        await newPlan.save();

        res.status(201).json({ success: true, plan: newPlan });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


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
// kyc 
// router.get('/kyc-requests', protect, adminOnly, async (req, res) => {
//     try {
//         let { status, email, phone, sort = '-createdAt' } = req.query;
//         let query = {};

//         if (status) query.kycStatus = status;
//         if (email) query.email = email;
//         if (phone) query.phone = phone;

//         const users = await User.find(query)
//             .select('username email phone kycDocuments.idProof kycDocuments.addressProof kycDocuments.selfie kycStatus')
//             .sort(sort);

//         res.json({ success: true, users });

//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });
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
  // yeh ri api bhaii test krte h na 
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

module.exports = router;
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiaGFyZGNvZGVkX2FkbWluX2lkIiwicm9sZSI6ImFkbWluIiwiZW1haWwiOiJzdW5pZGhpQGdtYWlsLmNvbSIsImlhdCI6MTc0Mjc0NzA1OSwiZXhwIjoxNzQyODMzNDU5fQ.yCGK7M_AM7boQXVKPQwSD4UJJvvb97fMiRRoI-Ppdo0