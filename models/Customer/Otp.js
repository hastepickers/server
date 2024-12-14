const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600000 }, // OTP expires in 10 minutes
});

const Otp = mongoose.model("Otp", otpSchema);
module.exports = Otp;
