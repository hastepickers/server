const express = require("express");
const DeviceToken = require("../../models/DeviceToken");
const { sendIOSPush } = require("../../utils/sendIOSPush");

const router = express.Router();

router.post("/push-notifications/register-device-token", async (req, res) => {
  try {
    const { userId, deviceToken } = req.body;

    console.log(userId, deviceToken, "userId");

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

router.post("/push-notifications/send", async (req, res) => {
  try {
    const { userIds, title, message } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: "userIds (array), title, and message are required.",
      });
    }

    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "Title and message are required." });
    }

  
    const users = await DeviceToken.find({ userId: { $in: userIds } });

    if (users.length === 0) {
      return res.status(404).json({
        message: "No users found or no device tokens registered.",
      });
    }
    const tokens = users.map((u) => u.deviceToken);
    const responses = [];
    for (const token of tokens) {
      const response = await sendIOSPush(token, title, message);
      responses.push({ token, response });
    }

    return res.status(200).json({
      message: "Notifications sent.",
      results: responses,
    });
  } catch (error) {
    console.error("❌ Error sending notifications:", error);
    return res.status(500).json({ message: "Failed to send notifications." });
  }
});
module.exports = router;
