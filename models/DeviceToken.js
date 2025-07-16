const mongoose = require("mongoose");

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    deviceToken: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeviceToken", deviceTokenSchema);
