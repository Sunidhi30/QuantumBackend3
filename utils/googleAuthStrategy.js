// googleAuthStrategy.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // Assuming you have a User model
const jwt = require('jsonwebtoken');
require("dotenv").config()

// Google OAuth Strategy Configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists in the database
      let user = await User.findOne({ 
        $or: [
          { googleId: profile.id },
          { email: profile.emails[0].value }
        ]
      });

      // If user doesn't exist, create a new user
      if (!user) {
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          username: profile.displayName,
          // Add any additional fields you want to store
          authMethod: 'google'
        });

        await user.save();
      } else {
        // If user exists but hasn't linked Google account
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1d' }
      );

      // Attach token to the user object
      user.token = token;

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }
));

// Google OAuth Routes
module.exports = (app) => {
  // Initial Google OAuth request
  app.get('/auth/google',
    passport.authenticate('google', { 
      scope: ['profile', 'email'] 
    })
  );

  // Google OAuth callback route
  app.get('/auth/google/callback', 
    passport.authenticate('google', { 
      session: false,
      failureRedirect: '/login' 
    }),
    (req, res) => {
      // Successful authentication, redirect or send token
    //   res.redirect(`/dashboard?token=${req.user.token}`);
      // Alternatively, you could send JSON response
      res.json({ token: req.user.token });
    }
  );

  // Link Google account to existing user
  app.get('/connect/google',
    passport.authorize('google', { 
      scope: ['profile', 'email'] 
    })
  );

  // Google account linking callback
  app.get('/connect/google/callback',
    passport.authorize('google', { 
      session: false,
      failureRedirect: '/profile' 
    }),
    (req, res) => {
      const user = req.user;
      res.redirect('/profile');
    }
  );
};

// Middleware to verify Google-authenticated JWT
// const verifyGoogleJwt = (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ message: 'No token provided' });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: 'Invalid or expired token' });
//   }
// };

module.exports = {
  configureGoogleAuth: module.exports,
};