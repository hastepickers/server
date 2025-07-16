const apn = require("apn");
const path = require("path");

// ✅ Configuration for APNs
const authKeyPath = path.resolve(__dirname, "../certs/AuthKey_5ZG98B43BM.p8"); // Your .p8 file
const keyId = "5ZG98B43BM"; // From Apple Developer
const teamId = "N2D98T6FJ5"; // From Apple Developer
const bundleId = "com.pickars.app"; // Your app's bundle ID

const options = {
  token: {
    key: authKeyPath,
    keyId: keyId,
    teamId: teamId,
  },
  production: true, // false for Sandbox, true for Production (TestFlight/App Store)
};

// ✅ Create APNs provider once and reuse
const apnProvider = new apn.Provider(options);

/**
 * Send iOS Push Notification
 * @param {string|string[]} deviceTokens - Single token or array of tokens
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} [customPayload] - Optional custom data
 */
async function sendIOSPush(deviceTokens, title, message, customPayload = {}) {
  // Ensure tokens are in array format
  const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];

  // Create a new notification
  const notification = new apn.Notification();
  notification.alert = { title, body: message };
  notification.sound = "default";
  notification.topic = bundleId;
  notification.payload = { ...customPayload }; // Optional custom data

  try {
    const response = await apnProvider.send(notification, tokens);
    console.log("✅ APNs Response:", JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
}

module.exports = sendIOSPush;
