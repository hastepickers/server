const mongoose = require("mongoose");

const ridersOtpSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // Expires after 10 minutes (600 seconds)
});

module.exports = mongoose.model("RidersOtp", ridersOtpSchema);
