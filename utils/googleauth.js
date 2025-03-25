const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:9000/api/auth/google/callback", // Full URL is important
        passReqToCallback: true // This allows accessing the request in the verify callback
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Find or create user in your database
          // Example (you'll need to implement your user model):
          // const existingUser = await User.findOne({ googleId: profile.id });
          // if (!existingUser) {
          //   const newUser = new User({
          //     googleId: profile.id,
          //     name: profile.displayName,
          //     email: profile.emails[0].value
          //   });
          //   await newUser.save();
          // }
  
          return done(null, profile);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  
  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });
  
  module.exports=passport