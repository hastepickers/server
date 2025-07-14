// routes/push.js
import express from "express";
//import sendPushNotification from "../utils/sendPushNotification.js"; // Adjust path if needed

const router = express.Router();

// In-memory store (replace with DB or Redis in production)
const deviceTokens = new Set();

// Register device token
router.post("/register-device-token", (req, res) => {
  const { deviceToken } = req.body;
  console.log("✅ device token:", deviceToken);

  if (!deviceToken) {
    return res.status(400).json({ message: "Device token is required." });
  }

  if (!deviceTokens.has(deviceToken)) {
    deviceTokens.add(deviceToken);
    console.log("✅ Registered device token:", deviceToken);
  } else {
    console.log("ℹ️ Device token already registered:", deviceToken);
  }

  return res.status(200).json({ message: "Device token registered." });
});

// Send push to a specific device
// router.post("/send-push", async (req, res) => {
//   const { deviceToken, message } = req.body;

//   if (!deviceToken || !message) {
//     return res.status(400).json({ message: "deviceToken and message are required." });
//   }

//   try {
//     const result = await sendPushNotification(deviceToken, message);
//     console.log(`📨 Sent push to ${deviceToken}`);
//     return res.status(200).json({ message: "Push notification sent.", result });
//   } catch (error) {
//     console.error("❌ Error sending push:", error.message);
//     return res.status(500).json({ message: "Failed to send push.", error: error.message });
//   }
// });

export default router;