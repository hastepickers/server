const express = require("express");
const DeviceToken = require("../../models/DeviceToken");
const {
  sendCustomerPush,
  sendDriverPush,
  sendIOSPush,
} = require("../../utils/sendIOSPush");
const DriverDeviceToken = require("../../models/DriverDeviceToken");
const { sendNotification } = require("../../controllers/Notifications/sendNotificationExpo");
const router = express.Router();
const MarketingToken = require("../../models/MarketingToken");

// ---------------------------
// iOS ROUTES
// ---------------------------
router.post("/push-notifications/register-device-token", async (req, res) => {
  try {
    let { userId, deviceToken, platform } = req.body;

    console.log(userId, deviceToken, platform, "registering iOS user");

    // ✅ Force platform to iOS
    platform = "ios";

    if (!userId || !deviceToken) {
      return res
        .status(400)
        .json({ message: "userId and deviceToken are required." });
    }

    const existing = await DeviceToken.findOne({ userId });

    if (existing) {
      existing.deviceToken = deviceToken;
      existing.platform = platform;
      await existing.save();
      return res
        .status(200)
        .json({ message: "iOS Device token updated successfully." });
    }

    await DeviceToken.create({ userId, deviceToken, platform });
    return res
      .status(201)
      .json({ message: "iOS Device token registered successfully." });
  } catch (error) {
    console.error("❌ Error registering iOS device token:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post(
  "/push-notifications/driver-register-device-token",
  async (req, res) => {
    try {
      let { userId, deviceToken, platform } = req.body;

      console.log(userId, deviceToken, platform, "registering iOS driver");

      // ✅ Force platform to iOS
      platform = "ios";

      if (!userId || !deviceToken) {
        return res
          .status(400)
          .json({ message: "userId and deviceToken are required." });
      }

      const existing = await DriverDeviceToken.findOne({ userId });

      if (existing) {
        existing.deviceToken = deviceToken;
        existing.platform = platform;
        await existing.save();
        return res
          .status(200)
          .json({ message: "iOS Driver device token updated successfully." });
      }

      await DriverDeviceToken.create({ userId, deviceToken, platform });
      return res
        .status(201)
        .json({ message: "iOS Driver device token registered successfully." });
    } catch (error) {
      console.error("❌ Error registering iOS driver device token:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// ---------------------------
// ANDROID ROUTES
// ---------------------------
router.post(
  "/push-notifications/android/register-device-token",
  async (req, res) => {
    try {
      let { userId, deviceToken } = req.body;

      console.log(userId, deviceToken, "registering Android user");

      // ✅ Force platform to Android
      const platform = "android";

      if (!userId || !deviceToken) {
        return res
          .status(400)
          .json({ message: "userId and deviceToken are required." });
      }

      const existing = await DeviceToken.findOne({ userId });

      if (existing) {
        existing.deviceToken = deviceToken;
        existing.platform = platform;
        await existing.save();
        return res
          .status(200)
          .json({ message: "Android Device token updated successfully." });
      }

      await DeviceToken.create({ userId, deviceToken, platform });
      return res
        .status(201)
        .json({ message: "Android Device token registered successfully." });
    } catch (error) {
      console.error("❌ Error registering Android device token:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

router.post(
  "/push-notifications/android/driver-register-device-token",
  async (req, res) => {
    try {
      let { userId, deviceToken } = req.body;

      console.log(userId, deviceToken, "registering Android driver");

      // ✅ Force platform to Android
      const platform = "android";

      if (!userId || !deviceToken) {
        return res
          .status(400)
          .json({ message: "userId and deviceToken are required." });
      }

      const existing = await DriverDeviceToken.findOne({ userId });

      if (existing) {
        existing.deviceToken = deviceToken;
        existing.platform = platform;
        await existing.save();
        return res.status(200).json({
          message: "Android Driver device token updated successfully.",
        });
      }

      await DriverDeviceToken.create({ userId, deviceToken, platform });
      return res.status(201).json({
        message: "Android Driver device token registered successfully.",
      });
    } catch (error) {
      console.error("❌ Error registering Android driver device token:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

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

    const users = await DriverDeviceToken.find({ userId: { $in: userIds } });
    console.log(users, 'users')
    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found with device tokens." });
    }

    const tokens = users.map((u) => u.deviceToken);
    const responses = [];

    for (const token of tokens) {
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

/**
 * @route POST /marketing/register-device-token
 * @desc Registers or updates a user's marketing device token(s).
 * @access Public
 */
router.post("/marketing/register-device-token", async (req, res) => {
  try {
    let { deviceTokens, platform } = req.body;

    if (
      !Array.isArray(deviceTokens) ||
      deviceTokens.length === 0 ||
      !platform
    ) {
      return res
        .status(400)
        .json({
          message: "An array of deviceTokens and platform are required.",
        });
    }

    // Find the single document for the given platform (e.g., "ios" or "android")
    let marketingDoc = await MarketingToken.findOne({ platform });

    if (marketingDoc) {
      // Create a set of unique tokens to avoid duplicates and add the new tokens
      const updatedTokens = new Set([
        ...marketingDoc.deviceTokens,
        ...deviceTokens,
      ]);
      marketingDoc.deviceTokens = Array.from(updatedTokens);
      await marketingDoc.save();
      return res
        .status(200)
        .json({
          message: `Marketing tokens updated successfully for platform ${platform}.`,
        });
    }

    // If no document exists for this platform, create a new one
    await MarketingToken.create({ deviceTokens, platform });
    return res
      .status(201)
      .json({
        message: `Marketing tokens registered successfully for platform ${platform}.`,
      });
  } catch (error) {
    console.error("❌ Error registering marketing device tokens:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/marketing/send", async (req, res) => {
  try {
    const { title, message, platform, screen, params } = req.body;

    // Validate required fields
    if (!platform) {
      return res.status(400).json({ message: "platform is required." });
    }
    if (!title || !message) {
      return res
        .status(400)
        .json({ message: "title and message are required." });
    }

    // Fetch the marketing token document for the specified platform
    const marketingDoc = await MarketingToken.findOne({ platform });
    if (!marketingDoc) {
      return res
        .status(404)
        .json({
          message: "No marketing tokens found for the specified platform.",
        });
    }

    const uniqueTokens = [...new Set(marketingDoc.deviceTokens)]; // Get unique tokens

    if (uniqueTokens.length === 0) {
      return res
        .status(404)
        .json({ message: "No device tokens found for sending notifications." });
    }

    const responses = [];
    const payload =
      screen || params ? { screen, params: params || {} } : undefined;

    for (const token of uniqueTokens) {
      // Assuming sendIOSPush handles both iOS and Android tokens correctly based on your existing code
      const response = await sendIOSPush(token, title, message, payload);
      responses.push({ token, response });
    }

    return res.status(200).json({
      message: `Marketing notifications sent to ${uniqueTokens.length} devices on platform ${platform}.`,
      results: responses,
    });
  } catch (error) {
    console.error("❌ Error sending marketing notifications:", error);
    return res.status(500).json({ message: "Failed to send notifications." });
  }
});


router.post("/expo-push/send", sendNotification);

module.exports = router;
