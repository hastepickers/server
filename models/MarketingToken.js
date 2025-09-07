const mongoose = require("mongoose");

const marketingTokenSchema = new mongoose.Schema(
  {
    deviceTokens: {
      type: [String],
      required: true,
      default: [],
    },
    platform: {
      type: String,
      enum: ["ios", "android",],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MarketingToken", marketingTokenSchema);
