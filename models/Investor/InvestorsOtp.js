const mongoose = require("mongoose");

const investorsOtpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // expires in 5 mins
});

const InvestorsOtp = mongoose.model("InvestorsOtp", investorsOtpSchema);

module.exports = InvestorsOtp;