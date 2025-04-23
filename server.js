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

// Route to view PDF inline
app.get('/api/users/:investmentId/schedule/pdf/view', (req, res) => {
  const { investmentId } = req.params;
  const pdfFileName = `investment_schedule_${investmentId}.pdf`;
  const pdfFilePath = path.resolve(__dirname, 'downloads', pdfFileName);

  if (!fs.existsSync(pdfFilePath)) {
    return res.status(404).json({
      success: false,
      message: "PDF not found. Please generate it first."
    });
  }

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${pdfFileName}"`
  });

  fs.createReadStream(pdfFilePath).pipe(res);
});
// Route to download the investment schedule as an Excel file
// Route to view Excel inline
app.get('/api/users/:investmentId/schedule/excel/view', async (req, res) => {
  try {
    const { investmentId } = req.params;
    const excelFileName = `investment_schedule_${investmentId}.xlsx`;
    const excelFilePath = path.resolve(__dirname, 'downloads', excelFileName);

    if (!fs.existsSync(excelFilePath)) {
      return res.status(404).json({
        success: false,
        message: "Excel file not found. Please generate it first."
      });
    }

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `inline; filename="${excelFileName}"`
    });

    fs.createReadStream(excelFilePath).pipe(res);
  } catch (error) {
    console.error("Error viewing Excel file:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

require('dotenv').config()
app.use(cors());
const PORT = process.env.PORT || 6000;
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/testing.html");
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
