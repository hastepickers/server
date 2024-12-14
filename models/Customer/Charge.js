const mongoose = require("mongoose");

const chargeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User", // Reference to the User model
  },
  withdrawalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Withdrawal", // Reference to the Withdrawal in CustomerEarning model
  },
  chargeAmount: {
    type: Number,
    default: 100, // Charge is fixed at 100 for every withdrawal
  },
  status: {
    type: String,
    enum: ["success", "failed", "pending"],
    required: true,
  },
  timeCharged: {
    type: Date,
    default: Date.now,
  },
});

const Charge = mongoose.model("Charge", chargeSchema);

module.exports = Charge;
