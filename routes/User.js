const express = require("express");
const router = express.Router();
const Plan = require("../models/Plan"); // Import Plan model
const { protect } = require("../middlewares/authMiddlewares"); // Only authentication required
const User = require("../models/User"); // Ensure correct path
const { uploadToCloudinary } = require("../utils/cloudinary");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

module.exports = router;
