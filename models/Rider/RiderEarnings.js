const mongoose = require("mongoose");

// Earnings Schema
const EarningsSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    header: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Earnings = mongoose.model("Earnings", EarningsSchema);
module.exports = Earnings;