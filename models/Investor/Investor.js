const mongoose = require("mongoose");

const investorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    alternateEmail: { type: String },
    role: {
      type: String,
      enum: ["Investor", "Board Member"],
      default: "Investor",
    },
    investorShare: { type: Number, required: true }, // percentage
    phone: { type: String, required: true, unique: true },
    address: { type: String },
    joined: { type: String },

    isSuperAdmin: { type: Boolean, default: false },
    // new fields for verification handling
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }, // ❌ removed expiry
  },
  { timestamps: true }
);

// ❌ removed TTL index (no auto-expiry)
const Investor = mongoose.model("Investor", investorSchema);

module.exports = Investor;