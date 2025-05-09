const express = require('express');
const app = express();
const db = require('./utils/db')
const {configureGoogleAuth} = require('./utils/googleAuthStrategy');
const cors = require("cors");
const authRoutes= require("./routes/auth")
const adminRoutes= require("./routes/admin")
const Users= require("./routes/User")
const path = require('path');
const session = require('express-session');
configureGoogleAuth(app);
const fs = require("fs"); 
// const walletRoutes=require("./routes/wallet")
let ejs = require('ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Set the view engine to EJS
app.set('view engine', 'ejs');
// Set the directory for EJS views
app.set('views', path.join(__dirname, 'views'));
require('dotenv').config()
app.use(cors());
const PORT = process.env.PORT || 6000;
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/testing.html");
})
app.get("/testing", (req, res) => {
  res.sendFile(__dirname + "/testingpdf.html");
})
// app.use("/api/users",userRoutes)
app.use("/api/auth",authRoutes)
app.use("/api/admin",adminRoutes)
app.use("/api/users",Users)
// app.use('/api/wallet', walletRoutes);
app.get('/session', (req, res) => {
    res.json({ sessionId: req.sessionID });
});
db().then(function (db) {
    console.log(`Db connnected`)
})
app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    })
  );
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
