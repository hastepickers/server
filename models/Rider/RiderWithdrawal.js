const mongoose = require("mongoose");

// Withdrawal Schema
const WithdrawalSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: true,
  },
  // header: {
  //   type: String,
  //   required: true,
  // },
  amount: {
    type: Number,
    required: true,
  },
  bank: {
    type: String,
    required: true,
  },
  accountName: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    required: true,
  },
  paystackDetails: {
    type: Array,
    default: [],
  },
  withdrawalID: { 
    type: String, 
    required: false 
  },
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

const Withdrawal = mongoose.model("Withdrawal", WithdrawalSchema);
module.exports = Withdrawal;