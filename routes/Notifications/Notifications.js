const express = require("express");
const DeviceToken = require("../../models/DeviceToken");
const { sendIOSPush } = require("../../utils/sendIOSPush");
const DriverDeviceToken = require('../../models/DriverDeviceToken')
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

router.post("/push-notifications/driver-register-device-token", async (req, res) => {
  try {
    const { userId, deviceToken } = req.body;

    console.log(userId, deviceToken, "userId");

    if (!userId || !deviceToken) {
      return res
        .status(400)
        .json({ message: "userId and deviceToken are required." });
    }

    const existing = await DriverDeviceToken.findOne({ userId });

    if (existing) {
      existing.deviceToken = deviceToken;
      await existing.save();
      return res
        .status(200)
        .json({ message: "Device token updated successfully." });
    }

    await DriverDeviceToken.create({ userId, deviceToken });
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
    const { userIds, title, message, screen, params } = req.body;

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds (array) are required." });
    }
    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "title and message are required." });
    }

    // Fetch users with matching device tokens
    const users = await DeviceToken.find({ userId: { $in: userIds } });
    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found with device tokens." });
    }

    const tokens = users.map((u) => u.deviceToken);
    const responses = [];

    for (const token of tokens) {
      // ✅ Only include payload if screen or params exist
      const payload =
        screen || params ? { screen, params: params || {} } : undefined;

      console.log(token, title, message, payload);
      const response = await sendIOSPush(token, title, message, payload,  );
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

router.post("/push-notifications/driver-send", async (req, res) => {
  try {
    const { userIds, title, message, screen, params } = req.body;

  
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds (array) are required." });
    }
    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "title and message are required." });
    }

    // Fetch users with matching device tokens
    const users = await DriverDeviceToken.find({ userId: { $in: userIds } });
    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found with device tokens." });
    }

    const tokens = users.map((u) => u.deviceToken);
    const responses = [];

    for (const token of tokens) {
      // ✅ Only include payload if screen or params exist
      const payload =
        screen || params ? { screen, params: params || {} } : undefined;

      console.log(token, title, message, payload);
      const response = await sendIOSPush(token, title, message, payload);
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
