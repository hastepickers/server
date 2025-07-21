// routes/push.js
import express from "express";

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

router.post("/driver-register-device-token", (req, res) => {
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



export default router;