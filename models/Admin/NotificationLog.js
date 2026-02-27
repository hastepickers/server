const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetType: {
      type: String,
      enum: ["BROADCAST", "SINGLE_USER"],
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Null if broadcast
      default: null,
    },
    deliveryStats: {
      totalDevices: { type: Number, default: 0 },
      iosCount: { type: Number, default: 0 },
      androidCount: { type: Number, default: 0 },
    },
    payload: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationLog", notificationLogSchema);
