const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    cacVerified: {
      type: Boolean,
      default: false,
    },
    cacDocuments: {
      type: String, // Assuming this will store the file path or URL of the uploaded document
      required: true,
    },
    riders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rider", // Reference to a Rider schema
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    balance: {
      type: Number,
      default: 0.0,
    },
    totalRides: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0.0,
    },
    totalWithdrawals: {
      type: Number,
      default: 0.0,
    },
    bonuses: {
      type: Number,
      default: 0.0,
    },
    registeredCompanyNumber: {
      type: String,
      required: false,
      unique: true,
    },
    businessName: {
      type: String,
      required: false,
      trim: true,
    },
    registeredBusinessNumber: {
      type: String,
      required: false,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);
