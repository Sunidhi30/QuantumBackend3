// const express = require('express');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();
// const Investment = require('../models/Investment'); // Import the Investment model
// const mongoose = require("mongoose")
// const router = express.Router();

// // Predefined admin credentials
// const ADMIN_EMAIL = "admin@gmail.com";
// const ADMIN_PHONE = "1234567890"; // Optional
// const ADMIN_OTP = "0000";
// const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// // Middleware to verify admin token
// const verifyAdmin = (req, res, next) => {
//     const token = req.header('Authorization');
//     if (!token) return res.status(401).json({ msg: 'Access Denied. No Token Provided.' });

//     try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         if (decoded.role !== 'admin') {
//             return res.status(403).json({ msg: 'Unauthorized access' });
//         }
//         req.admin = decoded;
//         next();
//     } catch (err) {
//         res.status(400).json({ msg: 'Invalid Token' });
//     }
// };

// // 1️⃣ **Admin Login (OTP Request)**
// router.post('/login', (req, res) => {
//     const { email, phone } = req.body;

//     if (email !== ADMIN_EMAIL && phone !== ADMIN_PHONE) {
//         return res.status(400).json({ msg: 'Unauthorized access' });
//     }

//     res.json({ msg: 'OTP sent (0000 for now)', otp: ADMIN_OTP });
// });

// // 2️⃣ **Verify Admin OTP & Issue Token**
// router.post('/verify-login-otp', (req, res) => {
//     // console.log("admin this is ")
//     const { email, phone, otp } = req.body;

//     if ((email !== ADMIN_EMAIL && phone !== ADMIN_PHONE) || otp !== ADMIN_OTP) {
//         return res.status(400).json({ msg: 'Invalid email/phone or OTP' });
//     }

//     // Generate JWT token
//     const token = jwt.sign({ role: 'admin', email }, JWT_SECRET, { expiresIn: '24h' });

//     res.json({ msg: 'Admin login successful', token });
// });

// // 3️⃣ **Protected Admin Dashboard**
// router.get('/dashboard', verifyAdmin, (req, res) => {
//     res.json({ msg: 'Welcome to Admin Dashboard', admin: req.admin });
// });

// // Add a new investment


// // Get all investments
// router.get('/investments', async (req, res) => {
//     try {
//         const investments = await Investment.find();
//         res.json(investments);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Get a single investment
// router.get('/investments/:id', async (req, res) => {
//     try {
//         const investment = await Investment.findById(req.params.id);
//         if (!investment) return res.status(404).json({ error: 'Investment not found' });
//         res.json(investment);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Update an investment
// router.put('/investments/:id', async (req, res) => {
//     try {
//         const updatedInvestment = await Investment.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         res.json(updatedInvestment);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // Delete an investment
// router.delete('/investments/:id', async (req, res) => {
//     try {
//         await Investment.findByIdAndDelete(req.params.id);
//         res.json({ message: 'Investment deleted' });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });


// router.post('/investments', async (req, res) => {
//     try {
//         const {
//             user,
//             plan,
//             planName,
//             amount,
//             apr,
//             endDate,
//             maturityAmount,
//             paymentMethod,
//             paymentDetails,
//             payoutFrequency,
//             paymentShield
//         } = req.body;

//         // Validate required fields
//         if (!user || !plan || !planName || !amount || !apr || !endDate || !maturityAmount || !paymentMethod) {
//             return res.status(400).json({ message: "All required fields must be provided" });
//         }

//         // Create a new investment
//         const newInvestment = new Investment({
//             user: new mongoose.Types.ObjectId(user),
//             plan: new mongoose.Types.ObjectId(plan),
//             planName,
//             amount,
//             apr,
//             startDate: Date.now(),
//             endDate,
//             maturityAmount,
//             paymentMethod,
//             paymentDetails,
//             payoutFrequency,
//             paymentShield,
//             status: 'pending', // Default status
//             totalReturns: 0,
//             createdAt: Date.now(),
//             updatedAt: Date.now()
//         });

//         await newInvestment.save();
//         res.status(201).json({ message: "Investment created successfully", investment: newInvestment });

//     } catch (error) {
//         console.error("Error creating investment:", error);
//         res.status(500).json({ message: "Server Error" });
//     }
// });

// // ✅ Get All Investments (GET)
// router.get('/investments', async (req, res) => {
//     try {
//         const investments = await Investment.find().populate('user plan payouts'); // Populating referenced fields
//         res.json(investments);
//     } catch (error) {
//         console.error("Error fetching investments:", error);
//         res.status(500).json({ message: "Server Error" });
//     }
// });





// module.exports = router;

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


// 1️⃣ **Admin Login (OTP Request)**


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
router.get('/kyc-requests', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({ kycStatus: "pending" })
            .select('username email kycDocuments.idProof kycDocuments.addressProof kycDocuments.selfie');

        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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
router.post('/plans', protect, adminOnly, async (req, res) => {
    try {
        const { 
            name, 
            type, 
            description, 
            apy, 
            tenureOptions, 
            paymentShield, 
            minInvestment, 
            maxInvestment, 
            dividend, 
            reward, 
            paymentOptions, 
            riskLevel 
        } = req.body;

        // Validate required fields
        if (!name || !type || !description || !apy || !tenureOptions || !minInvestment || !maxInvestment || !dividend || !riskLevel) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Create new investment plan
        const newPlan = new Plan({
            name,
            type,
            description,
            apy,
            tenureOptions,
            paymentShield,
            minInvestment,
            maxInvestment,
            dividend,
            reward,
            paymentOptions,
            riskLevel
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


module.exports = router;
