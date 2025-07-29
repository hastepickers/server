const admin = require("../firebaseAdmin");

/**
 * Send Push Notification using Firebase Cloud Messaging
 * @param {string|string[]} tokens - Device token or array of tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} [data] - Optional custom data payload
 */
const sendFirebasePush = async (tokens, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data, // Custom key-value pairs
      },
      tokens: Array.isArray(tokens) ? tokens : [tokens], // Supports multiple tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log("✅ Push Notification Sent:", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
    throw error;
  }
};

module.exports = { sendFirebasePush };
