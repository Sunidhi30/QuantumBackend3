const express = require('express');
const app = express();
const db = require('./utils/db')
const userRoutes = require("./routes/users")
const authRoutes= require("./routes/auth")
const adminRoutes= require("./routes/admin")
let ejs = require('ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

require('dotenv').config()


const PORT = process.env.PORT || 9000;
app.use("/api/users",userRoutes)
app.use("/api/auth",authRoutes)
app.use("/api/admin",adminRoutes)


db().then(function (db) {
    console.log(`Db connnected`)
})


app.listen(PORT,()=>{
   console.log(`Server started at ${PORT}`)
})
