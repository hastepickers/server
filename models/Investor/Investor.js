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

    // new fields for verification handling
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 1800 }, // 1800 secs = 30 mins
  },
  { timestamps: true }
);

investorSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 1800, partialFilterExpression: { verified: false } }
);

const Investor = mongoose.model("Investor", investorSchema);

module.exports = Investor;
