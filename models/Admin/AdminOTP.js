const mongoose = require("mongoose");

const adminOtpSchema = new mongoose.Schema(
  {
    adminEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    // The OTP will automatically be deleted 10 minutes after creation
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // 600 seconds = 10 minutes
    },
  },
  { timestamps: true }
);

// Index to find the latest OTP for an email quickly
adminOtpSchema.index({ adminEmail: 1, createdAt: -1 });

module.exports = mongoose.model("AdminOTP", adminOtpSchema);