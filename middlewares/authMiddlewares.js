

const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure correct path
const Admin = require("../models/Admin");
require('dotenv').config();

/**
 * 🔹 Middleware to verify JWT authentication
 */
exports.protect = async (req, res, next) => {
    let token;
  
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
  
    if (!token) {
      return res.status(401).json({ message: 'Access Denied. No Token Provided.' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded Token:', decoded);
  
      if (decoded.adminId) {
        const admin = await Admin.findById(decoded.adminId);
        if (!admin) return res.status(401).json({ message: 'Admin not found' });
  
        req.user = {
          _id: admin._id,
          email: admin.email,
          role: admin.role
        };
      } else if (decoded.userId) {
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(401).json({ message: 'User not found' });
  
        req.user = user;
      } else {
        return res.status(401).json({ message: 'Invalid token payload' });
      }
  
      next();
  
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Invalid Token' });
    }
  };
// exports.protect = async (req, res, next) => {
//     let token;

//     // Check if token is provided in the Authorization header
//     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//         token = req.headers.authorization.split(' ')[1];
//     }

//     if (!token) {
//         return res.status(401).json({ message: 'Access Denied. No Token Provided.' });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         console.log(decoded)
     
//         // ✅ Update the email to match your hardcoded admin email
//         if (decoded.role === 'admin' && decoded.email === 'sunidhi@gmail.com') {
//             req.user = { role: 'admin', email: 'sunidhi@gmail.com' };
//             return next();
//         }
//         // agr database mai set krege toh vo kaise krege 

//         req.user = await User.findById(decoded.userId);
    
   
            
//         console.log("Decoded User:", req.user); // ✅ Debugging log
// //han
//         if (!req.user) {
//             return res.status(401).json({ msg: "User not found" });
//         }
//         next();
      


//     } catch (error) {
//         res.status(401).json({ message: 'Invalid Token' });
//     }
// };

/**
 * 🔹 Middleware to restrict access to admin-only routes
 */
exports.adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
    }
    next();
};
exports.verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid Token' });
    }
};
