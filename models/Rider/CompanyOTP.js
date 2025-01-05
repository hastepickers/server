const mongoose = require("mongoose");

const CompanyOTPSchema = new mongoose.Schema({
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // OTP expires after 5 minutes
    },
  });
  
  const CompanyOTP = mongoose.model("CompanyOTP", CompanyOTPSchema);
  module.exports = CompanyOTP;