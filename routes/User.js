const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const Plan = require('../models/Plan');

const router = express.Router();

// ✅ Get All Active Investment Plans for Users
router.get('/user/plans', protect, async (req, res) => {
    try {
        let query = { isActive: true }; // Users can only see active plans

        // Apply filters based on query parameters
        if (req.query.minInvestment) {
            query.minInvestment = { $gte: Number(req.query.minInvestment) };
        }
        if (req.query.maxInvestment) {
            query.maxInvestment = { $lte: Number(req.query.maxInvestment) };
        }
        if (req.query.tenure) {
            query.tenureOptions = req.query.tenure; // Match tenure exactly
        }

        const plans = await Plan.find(query).select('-createdAt -updatedAt'); // Exclude timestamps

        res.json({ success: true, plans });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
