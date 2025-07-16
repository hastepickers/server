const express = require("express");
const apn = require("apn");

const router = express.Router();

// Set up APNs provider with your credentials
const apnProvider = new apn.Provider({
  token: {
    key: "./AuthKey.p8", // Path to your .p8 APNs authentication key
    keyId: "<Your_Key_ID>", // Your APNs key ID
    teamId: "<Your_Team_ID>", // Your Apple Developer Team ID
  },
  production: false, // Set to true for production environment
});

// Endpoint to send push notification
router.post("/send-push", (req, res) => {
  const { deviceToken, title, body } = req.body;

  // Set up the notification payload
  let notification = new apn.Notification({
    alert: {
      title,
      body,
    },
    sound: "default",
    topic: "<Your App Bundle Identifier>", // e.g., com.example.app
  });

  // Send the notification to the specified device token
  apnProvider.send(notification, deviceToken).then((response) => {
    if (response.failed.length > 0) {
      return res.status(500).json({ error: "Failed to send notification" });
    }
    res.json({ success: "Notification sent successfully" });
  });
});

module.exports = router;
