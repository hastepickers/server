const apn = require("apn");
const path = require("path");
require("dotenv").config(); // Load .env file if not already loaded

// ✅ Load environment variables
const authKeyPath = path.resolve(__dirname, "../certs/AuthKey_5ZG98B43BM.p8");

const keyId = process.env.KEY_ID;
const teamId = process.env.TEAM_ID;
const bundleId = process.env.BUNDLE_ID;
const isProduction = "production"; // Auto detect

// ✅ Validate required env vars
if (!keyId || !teamId || !bundleId || !authKeyPath) {
  throw new Error(
    "❌ Missing APNs environment variables. Check your .env file."
  );
}

// ✅ Configure APNs
const options = {
  token: {
    key: authKeyPath,
    keyId,
    teamId,
  },
  production: isProduction,
};

// ✅ Create APNs provider
const apnProvider = new apn.Provider(options);

/**
 * Send iOS Push Notification
 * @param {string|string[]} deviceToken - Device token or array of tokens
 * @param {string} title                - Notification title
 * @param {string} message              - Notification body
 * @param {Object} [payload={}]         - Optional custom payload
 */
async function sendIOSPush(deviceToken, title, message, payload = {}) {
  try {
    const notification = new apn.Notification();

    // ✅ Set notification content
    notification.alert = { title, body: message };
    notification.sound = "default";
    notification.topic = bundleId;

    // ✅ Add custom payload
    if (Object.keys(payload).length > 0) {
      notification.payload = payload;
    }

    // ✅ Handle multiple tokens
    const tokens = Array.isArray(deviceToken) ? deviceToken : [deviceToken];

    const result = await apnProvider.send(notification, tokens);

    console.log(
      "✅ Push Notification Result:",
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
    throw error;
  }
}

module.exports = { sendIOSPush };
