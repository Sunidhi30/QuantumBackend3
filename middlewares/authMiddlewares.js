// const jwt = require('jsonwebtoken');
// const User = require('../models/User');
// require('dotenv').config();

// /**
//  * 🔹 Middleware to verify JWT authentication
//  */
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
//         // const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         // req.user = await User.findById(decoded.adminId || decoded.userId);
//         // if (!req.user) return res.status(401).json({ message: 'User Not Found' });
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         // ✅ If hardcoded admin, skip database lookup
//         if (decoded.role === 'admin' && decoded.email === 'admin@gmail.com') {
//             req.user = { role: 'admin', email: 'admin@gmail.com' };
//             return next();
//         }

//         return res.status(401).json({ message: 'User Not Found' });

//     } catch (error) {
//         res.status(401).json({ message: 'Invalid Token' });
//     }
// };

// /**
//  * 🔹 Middleware to restrict access to admin-only routes
//  */
// exports.adminOnly = (req, res, next) => {
//     if (!req.user || req.user.role !== 'admin') {
//         return res.status(403).json({ message: 'Admin access only' });
//     }
//     next();
// };
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure correct path

require('dotenv').config();

/**
 * 🔹 Middleware to verify JWT authentication
 */
exports.protect = async (req, res, next) => {
    let token;

    // Check if token is provided in the Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Access Denied. No Token Provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(decoded)

        // ✅ Update the email to match your hardcoded admin email
        // if (decoded.role === 'admin' && decoded.email === 'sunidhi@gmail.com') {
        //     req.user = { role: 'admin', email: 'sunidhi@gmail.com' };
        //     return next();
        // }

        req.user = await User.findById(decoded.userId);
            
        console.log("Decoded User:", req.user); // ✅ Debugging log

        if (!req.user) {
            return res.status(401).json({ msg: "User not found" });
        }

        next();


    } catch (error) {
        res.status(401).json({ message: 'Invalid Token' });
    }
};

/**
 * 🔹 Middleware to restrict access to admin-only routes
 */
exports.adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
    }
    next();
};
