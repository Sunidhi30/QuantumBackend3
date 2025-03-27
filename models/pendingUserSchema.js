// const mongoose = require('mongoose'); // ✅ Import mongoose
// const mongoose = require('mongoose');
// const { userSchema } = require('./User'); // Import userSchema

// const pendingUserSchema = new mongoose.Schema({
//   username: {
//     type: String,
//     trim: true
//   },
//   mobileNumber: {
//     type: String,
//     required: false, // Optional, since users can register with email or phone
//   },
//   email: {
//     type: String,
//     required: false, // Optional, since users can register with email or phone
//     trim: true,
//     lowercase: true
//   },
//   emailOtp: {
//     type: String
//   },
//   emailOtpExpiry: {
//     type: Date
//   },
//   phonePin: {
//     type: String
//   },
//   phonePinExpiry: {
//     type: Date
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//     expires: 600 // Auto-delete after 10 minutes
//   }
// });

// // Check if model is already registered to avoid errors
// const PendingUser = mongoose.models.PendingUser || mongoose.model('PendingUser', pendingUserSchema);

// module.exports = PendingUser;
