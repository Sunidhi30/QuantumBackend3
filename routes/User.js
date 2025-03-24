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

// 🔹 Fetch all plans (Accessible by all logged-in users)
router.get('/plans', protect,async (req, res) => {
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

router.get('/plans/category/:category', protect, async (req, res) => {
    try {
        const category = req.params.category.toLowerCase(); // ✅ Convert to lowercase

        const plans = await Plan.find({ category });

        if (plans.length === 0) {
            return res.status(404).json({ msg: 'No plans found for this category' });
        }

        res.json({ success: true, plans });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// deal highlights 
// router.get("/plans/deal-highlights", protect, async (req, res) => {
//     try {
//       // Fetch only active plans that have deal highlights
//       const plans = await Plan.find(
//         { isActive: true, dealHighlights: { $exists: true } }, 
//         { name: 1, type: 1, category: 1, dealHighlights: 1 }
//       );
  
//       if (!plans.length) {
//         return res.status(404).json({ success: false, message: "No plans with deal highlights found." });
//       }
  
//       res.status(200).json({ success: true, plans });
//     } catch (error) {
//       console.error("Error fetching deal highlights:", error);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   });
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
router.get('/plans/:id', protect, async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ success: false, message: "Plan not found" });
        }
        res.status(200).json({ success: true, plan });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
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
router.get('/plans/rewards', protect, async (req, res) => {
    try {
        const plans = await Plan.find({}, { name: 1, dealHighlights: 1 });

        if (!plans.length) {
            return res.status(404).json({ success: false, message: "No rewards available" });
        }

        res.status(200).json({ success: true, rewards: plans.map(plan => ({
            name: plan.name,
            reward: plan.dealHighlights.reward || "No reward details available"
        }))});
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


  
router.post("/kyc", protect, upload.fields([
    
    { name: "idProof", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
    // pgl hj user ka phle upload
    
]), async (req, res) => {
    console.log(req.files)
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const { nationality, accountHolderName,accountNumber,ifscCode,bankName} = req.body;

        if (!req.files.idProof || !req.files.addressProof) {
            return res.status(400).json({ message: "All required documents must be uploaded" });
        }

        if (nationality === "Indian" && !req.files.panCard) {
            return res.status(400).json({ message: "PAN Card is required for Indian users" });
        }

        // Upload to Cloudinary
        console.log("this is cloud")
        const idProofBase64 = `data:image/png;base64,${req.files.idProof[0].buffer.toString("base64")}`;
const idProofUrl = await uploadToCloudinary(idProofBase64, "kyc_docs");

        console.log(idProofUrl+"Id proof ")

        const panCardUrl = `data:image/png;base64,${req.files.panCard[0].buffer.toString("base64")}`;
        const panCardProofUrl = await uploadToCloudinary(panCardUrl, "kyc_docs");

        const addressProofUrl = `data:image/png;base64,${req.files.addressProof[0].buffer.toString("base64")}`;
        const addressidProofUrl = await uploadToCloudinary(addressProofUrl, "kyc_docs");

      //thek h


        let bankDetails = {accountHolderName,accountNumber,ifscCode,bankName};
        
        // Update user KYC details 
        user.kycDocuments = {
            idProof: idProofUrl,
            panCard: panCardProofUrl,
            addressProof: addressidProofUrl,
            
            bankDetails: bankDetails,// to fr ese bhi form vaal kr lete h key value pair 
        };
        user.kycStatus = "pending";

        await user.save();
        res.status(200).json({ success: true, message: "KYC submitted successfully. Waiting for admin approval." });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// investments plans acocrding tot he user 
router.post('/invest', protect, async (req, res) => {
    try {
        const { planId, amount, paymentMethod, paymentDetails } = req.body;
        const userId = req.user.id; // Assuming `req.user` contains the authenticated user's details

        // Validate required fields
        if (!planId || !amount || !paymentMethod) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if the plan exists
        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(404).json({ message: "Plan not found or inactive" });
        }

        // Validate investment amount
        if (amount < plan.minInvestment || amount > plan.maxInvestment) {
            return res.status(400).json({ message: `Investment amount must be between ${plan.minInvestment} and ${plan.maxInvestment}` });
        }

        // Fetch the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user has enough wallet balance (optional)
        // i will used after I intergrate the payements gateway
        // if (user.walletBalance < amount) {
        //     return res.status(400).json({ message: "Insufficient wallet balance" });
        // }

        // Calculate maturity date (Assuming the longest tenure is used)
        const tenureInMonths = parseInt(plan.tenureOptions[plan.tenureOptions.length - 1]); // Get the last tenure option
        const maturityDate = new Date();
        maturityDate.setMonth(maturityDate.getMonth() + tenureInMonths);

        // Calculate maturity amount (Simple calculation: Principal + (APR % over tenure))
        const maturityAmount = amount + (amount * (plan.apy / 100));

        // Create new investment record
        const newInvestment = new Investment({
            user: userId,
            plan: planId,
            planName: plan.name,
            amount,
            apr: plan.apy,
            startDate: new Date(),
            endDate: maturityDate,
            maturityAmount,
            paymentMethod,
            paymentDetails,
            payoutFrequency: plan.paymentOptions[0], // Default to the first payment option
            status: "pending"
        });

        await newInvestment.save();

        // Deduct amount from user's wallet (if applicable)
        user.walletBalance -= amount;
        user.totalInvestment += amount;
        await user.save();

        res.status(201).json({ success: true, investment: newInvestment });

    } catch (error) {
        console.error("Error in investment:", error);
        res.status(500).json({ error: error.message });
    }
});
// invest money in the plan 
router.post("/investments/create", protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const { planId, amount, paymentMethod, paymentDetails } = req.body;

        // Validate required fields
        if (!planId || !amount || !paymentMethod) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Fetch the investment plan
        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(404).json({ success: false, message: "Plan not found or inactive" });
        }

        // Validate investment amount
        if (amount < plan.minInvestment || amount > plan.maxInvestment) {
            return res.status(400).json({ success: false, message: `Investment amount must be between ₹${plan.minInvestment} and ₹${plan.maxInvestment}` });
        }

        // Fetch user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if the user has enough wallet balance (Optional - Uncomment if wallet system is implemented)
        // if (user.walletBalance < amount) {
        //     return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        // }

        // Calculate maturity date based on tenure
        const tenureInMonths = parseInt(plan.tenureOptions[plan.tenureOptions.length - 1]); // Get last tenure option
        const maturityDate = new Date();
        maturityDate.setMonth(maturityDate.getMonth() + tenureInMonths);

        // Calculate maturity amount using simple interest formula
        const maturityAmount = amount + (amount * (plan.apy / 100));

        // Create new investment record
        const newInvestment = new Investment({
            user: userId,
            plan: planId,
            planName: plan.name,
            amount,
            apr: plan.apy,
            startDate: new Date(),
            endDate: maturityDate,
            maturityAmount,
            paymentMethod,
            paymentDetails,
            payoutFrequency: plan.paymentOptions[0], // Default to first option
            status: "pending" // Change to "active" after admin approval (if required)
        });

        await newInvestment.save();

        // Deduct from user's wallet (If wallet system is used)
        // user.walletBalance -= amount;
        user.totalInvestment += amount;
        await user.save();

        res.status(201).json({ success: true, message: "Investment successful!", investment: newInvestment });

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
router.get('/:investmentId/schedule', protect, async (req, res) => {
    try {
        const investment = await Investment.findById(req.params.investmentId).populate('plan');

        if (!investment) {
            return res.status(404).json({ success: false, message: "Investment not found" });
        }

        const { amount, tenureMonths, plan } = investment;
        const { apy } = plan;
        
        let schedule = calculateInvestmentSchedule(amount, apy, tenureMonths);
        
        res.json({
            success: true,
            investmentId: investment._id,
            planName: plan.name,
            tenureMonths,
            principal: schedule.principal,
            monthlyInterest: schedule.monthlyInterest.toFixed(2),
            totalMonthlyReturns: schedule.totalMonthlyReturns.toFixed(2)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// @route   GET /api/investments/:investmentId/schedule/pdf
// @desc    Download investment schedule as PDF
// @access  Private
// router.get('/:investmentId/schedule/pdf', protect, async (req, res) => {
//     try {
//         const investment = await Investment.findById(req.params.investmentId).populate('plan');

//         if (!investment) {
//             return res.status(404).json({ success: false, message: "Investment not found" });
//         }

//         const { amount, tenureMonths, plan } = investment;
//         const { apy } = plan;
        
//         let schedule = calculateInvestmentSchedule(amount, apy, tenureMonths);
        
//         // Create PDF
//         const doc = new PDFDocument();
//         res.setHeader('Content-Disposition', 'attachment; filename="investment_schedule.pdf"');
//         res.setHeader('Content-Type', 'application/pdf');
//         doc.pipe(res);

//         doc.fontSize(16).text('Investment Schedule', { align: 'center' }).moveDown();
//         doc.fontSize(12).text(`Plan Name: ${plan.name}`);
//         doc.text(`Tenure: ${tenureMonths} months`);
//         doc.text(`Principal: $${schedule.principal}`);
//         doc.text(`Monthly Interest: $${schedule.monthlyInterest.toFixed(2)}`);
//         doc.text(`Total Monthly Returns: $${schedule.totalMonthlyReturns.toFixed(2)}`);

//         doc.end();
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, message: "Server Error" });
//     }
// });
router.get('/:investmentId/schedule/pdf', protect, async (req, res) => {
    try {
        const investment = await Investment.findById(req.params.investmentId).populate('plan');

        if (!investment) {
            return res.status(404).json({ success: false, message: "Investment not found" });
        }

        const { amount, startDate, endDate, plan } = investment;
        const { apy, minInvestment } = plan;

        // 🔹 Calculate number of units (how many times minInvestment fits into the amount)
        const units = amount / minInvestment;

        // 🔹 Calculate interest per unit
        const monthlyRate = apy / 12 / 100;
        const monthlyInterestPerUnit = minInvestment * monthlyRate;

        // 🔹 Total Monthly Interest
        const totalMonthlyInterest = monthlyInterestPerUnit * units;

        // 🔹 Total Profit
        const totalProfit = (amount * apy) / 100;

        // 🔹 Final Maturity Value
        const totalMaturityAmount = amount + totalProfit;

        // 🔹 Format dates
        const formattedStartDate = new Date(startDate).toLocaleDateString();
        const formattedEndDate = new Date(endDate).toLocaleDateString();

        // 🔹 Create PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename="investment_schedule.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // 🔹 PDF Content
        doc.fontSize(16).text('Investment Schedule', { align: 'center' }).moveDown();
        doc.fontSize(12).text(`Plan Name: ${plan.name}`);
        doc.text(`Investment Start Date: ${formattedStartDate}`);
        doc.text(`Investment End Date: ${formattedEndDate}`);
        doc.text(`Tenure: ${plan.tenureOptions[0]}`);
        doc.text(`Principal Investment: ₹${amount}`);
        doc.text(`Number of Units: ${units}`);
        doc.text(`APY: ${apy}%`);
        doc.text(`Monthly Interest Per Unit: ₹${monthlyInterestPerUnit.toFixed(2)}`);
        doc.text(`Total Monthly Interest: ₹${totalMonthlyInterest.toFixed(2)}`);
        doc.text(`Total Profit Earned: ₹${totalProfit.toFixed(2)}`);
        doc.text(`Final Maturity Amount: ₹${totalMaturityAmount.toFixed(2)}`);

        doc.end();

    } catch (error) {
        console.error("Error generating investment schedule PDF:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});
router.get("/faq", async (req, res) => {
    try {
        const faqs = await FAQ.find().sort({ createdAt: -1 });
        res.json({ success: true, faqs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
//67e02ee2abbc823b4505e9a7
//