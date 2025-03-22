// const express = require('express');
// const router = express.Router();
// const mongoose = require('mongoose');
// const Investment= require("../models/Investment")
// // ✅ Create an Investment (POST)

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
