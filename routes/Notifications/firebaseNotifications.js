const express = require("express");
const DeviceToken = require("../../models/DeviceToken");
const DriverDeviceToken = require("../../models/DriverDeviceToken");
const { sendFirebasePush } = require("../../utils/firebasePush");

const router = express.Router();


router.post("/push-notifications/firebase/send", async (req, res) => {
  try {
    const { userIds, title, message, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds (array) are required." });
    }
    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "title and message are required." });
    }
    const users = await DeviceToken.find({ userId: { $in: userIds } });
    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found with device tokens." });
    }

    const tokens = users.map((u) => u.deviceToken);

    const response = await sendFirebasePush(tokens, title, message, data);
    return res.status(200).json({ message: "Notifications sent.", response });
  } catch (error) {
    console.error("❌ Error sending Firebase notifications:", error);
    return res.status(500).json({ message: "Failed to send notifications." });
  }
});


router.post("/push-notifications/firebase/driver-send", async (req, res) => {
  try {
    const { userIds, title, message, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "userIds (array) are required." });
    }
    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "title and message are required." });
    }

    const drivers = await DriverDeviceToken.find({ userId: { $in: userIds } });
    if (drivers.length === 0) {
      return res
        .status(404)
        .json({ message: "No drivers found with device tokens." });
    }

    const tokens = drivers.map((d) => d.deviceToken);

    const response = await sendFirebasePush(tokens, title, message, data);
    return res
      .status(200)
      .json({ message: "Driver notifications sent.", response });
  } catch (error) {
    console.error("❌ Error sending Firebase notifications to drivers:", error);
    return res.status(500).json({ message: "Failed to send notifications." });
  }
});

module.exports = router;
