const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error("Error: MONGODB_URI environment variable not set. Please create a .env file with MONGODB_URI=your_connection_string");
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });

const loginSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true }
});

const Login = mongoose.model("Login", loginSchema);

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = new Login({ name, email: email.toLowerCase(), passwordHash });
    await newUser.save();
    res.json({ success: true, message: "Signup successful!" });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.email) {
      res.status(400).json({ success: false, message: "Email already in use." });
    } else {
      console.error("Signup error:", error);
      res.status(500).json({ success: false, message: "Signup failed. Please try again later." });
    }
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("Attempting login with email:", email);
    const user = await Login.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    if (!user.passwordHash) {
      console.error("Critical Error: User object missing passwordHash:", user);
      return res.status(500).json({ success: false, message: "Server error: User data is corrupted. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }
    res.json({ success: true, redirectUrl: "/LanguagePage" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed. Please try again later." });
  }
});

app.listen(process.env.PORT || 8081, () => {
  console.log(`Server listening on port ${process.env.PORT || 8081}`);
});
