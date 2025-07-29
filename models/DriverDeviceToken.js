const mongoose = require("mongoose");

const driverDeviceTokenSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    deviceToken: { type: String, required: true },
    platform: { type: String, enum: ["ios", "android"], required: true }, // Added platform
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriverDeviceToken", driverDeviceTokenSchema);