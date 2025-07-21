const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600000 }, // OTP expires in 10 minutes
  attempts: { type: Number, default: 0 }, // Track OTP attempts
  lastAttemptAt: { type: Date, default: Date.now }
});

const Otp = mongoose.model("Otp", otpSchema);
module.exports = Otp;
