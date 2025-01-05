const mongoose = require("mongoose");

const BonusesSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    default: Date.now,
  },
  bonusId: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
  },
});

const Bonus = mongoose.model("Bonus", BonusesSchema);
module.exports = Bonus;
