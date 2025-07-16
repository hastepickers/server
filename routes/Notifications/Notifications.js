const express = require("express");
const DeviceToken = require("../models/DeviceToken");
const sendIOSPush = require("../services/apnSender");

const router = express.Router();

router.post("/push/notifications/register-device-token", async (req, res) => {
  try {
    const { userId, deviceToken } = req.body;

    if (!userId || !deviceToken) {
      return res
        .status(400)
        .json({ message: "userId and deviceToken are required." });
    }

    const existing = await DeviceToken.findOne({ userId });

    if (existing) {
      existing.deviceToken = deviceToken;
      await existing.save();
      return res
        .status(200)
        .json({ message: "Device token updated successfully." });
    }
    
    await DeviceToken.create({ userId, deviceToken });
    return res
      .status(201)
      .json({ message: "Device token registered successfully." });
  } catch (error) {
    console.error("❌ Error registering device token:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/push/notifications/send", async (req, res) => {
  try {
    const { userId, title, message } = req.body;

    if (!userId || !title || !message) {
      return res
        .status(400)
        .json({ message: "userId, title, and message are required." });
    }

    const user = await DeviceToken.findOne({ userId });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or no device token registered." });
    }

    const response = await sendIOSPush(user.deviceToken, title, message);
    return res.status(200).json({ message: "Notification sent.", response });
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    return res.status(500).json({ message: "Failed to send notification." });
  }
});

module.exports = router;
