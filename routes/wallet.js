const express = require('express');
const router = express.Router();
const axios = require('axios');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const razorpay = require('../utils/razorpay');  // Import Razorpay instance
const { protect } = require('../middlewares/authMiddlewares');  // Middleware for authentication

router.post('/add-money', protect, async (req, res) => {
    try {
        const { amount, paymentMethod } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        // Create a transaction entry in DB
        const transaction = new Transaction({
            user: userId,
            amount,
            type: 'deposit',
            paymentMethod,
            status: 'pending'
        });
        await transaction.save();

        // If using Razorpay Payment Gateway
        if (paymentMethod === 'payment_gateway') {
            const order = await razorpay.orders.create({
                amount: amount * 100, // Amount in paise (₹1 = 100 paise)
                currency: "INR",
                receipt: transaction._id.toString(),
                payment_capture: 1 // Auto capture
            });

            return res.status(200).json({ 
                message: "Payment initiated", 
                orderId: order.id,
                transactionId: transaction._id 
            });
        }

        // For bank transfer or manual payments
        return res.status(200).json({
            message: "Transaction recorded, awaiting confirmation",
            transactionId: transaction._id
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
