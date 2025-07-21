const DeviceToken = require("../models/DeviceToken");
const { sendCustomerPush } = require("../utils/sendIOSPush");

/**
 * Middleware for sending push notifications
 * Usage:
 * req.pushOptions = {
 *   userIds: ["userId1", "userId2"],
 *   title: "Notification Title",
 *   message: "Notification Message",
 *   screen: "OptionalScreenName",
 *   params: { key: "value" }
 * };
 */
const sendPushNotificationMiddleware = async (req, res, next) => {
  try {
    const { userIds, title, message, screen, params } = req.pushOptions || {};

    if (!userIds || !title || !message) {
      return res.status(400).json({
        message: "userIds, title, and message are required in req.pushOptions.",
      });
    }

    const ids = Array.isArray(userIds) ? userIds : [userIds];

    // ✅ Fetch device tokens for the given user IDs
    const users = await DeviceToken.find({ userId: { $in: ids } });
    if (users.length === 0) {
      return res.status(404).json({
        message: "No device tokens found for provided userIds.",
      });
    }

    const tokens = users.map((u) => u.deviceToken);
    const payload = screen || params ? { screen, params: params || {} } : {};

    const responses = [];
    for (const token of tokens) {
      const response = await sendCustomerPush(token, title, message, payload);
      responses.push({ token, response });
    }

    req.pushResults = responses; // ✅ Attach results for next middleware
    next();
  } catch (error) {
    console.error("❌ Error in push notification middleware:", error);
    return res.status(500).json({
      message: "Failed to send notifications.",
      error: error.message,
    });
  }
};

module.exports = sendPushNotificationMiddleware;