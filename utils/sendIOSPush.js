const apn = require("apn");
const path = require("path");
require("dotenv").config();
const fs = require("fs");
const DeviceToken = require("../models/DeviceToken");

const authKeyPath = path.resolve(process.env.APN_KEY_PATH);

const keyId = process.env.KEY_ID;
const teamId = process.env.TEAM_ID;
const defaultBundleId = process.env.BUNDLE_ID; // com.pickars.app
const isProduction = true; // or detect env

if (!keyId || !teamId || !defaultBundleId) {
  throw new Error("❌ Missing APNs environment variables.");
}

const isProd = process.env.NODE_ENV === "production";

const key = isProd
  ? process.env.APN_KEY_CONTENT
  : fs.readFileSync(path.resolve("certs/AuthKey_5ZG98B43BM.p8"), "utf8");

const options = {
  token: {
    key,
    keyId,
    teamId,
  },
  production: isProduction,
};

const apnProvider = new apn.Provider(options);

/**
 * Send iOS Push Notification (supports multiple bundle IDs)
 * @param {string|string[]} deviceToken
 * @param {string} title
 * @param {string} message
 * @param {Object} [payload={}]
 * @param {string} [customBundleId] - Optional bundleId (e.g., drivers app)
 */
async function sendIOSPush(
  deviceToken,
  title,
  message,
  payload = {},
  customBundleId
) {
  try {
    const notification = new apn.Notification();

    notification.alert = { title, body: message };
    notification.sound = "default";
    notification.topic = customBundleId || defaultBundleId; // ✅ Use custom or default

    if (Object.keys(payload).length > 0) {
      notification.payload = payload;
    }

    const tokens = Array.isArray(deviceToken) ? deviceToken : [deviceToken];
    const result = await apnProvider.send(notification, tokens);

    if (result.failed.length > 0) {
      for (const failure of result.failed) {
        if (
          failure.response.reason === "BadDeviceToken" ||
          failure.response.reason === "Unregistered"
        ) {
          console.log(`🧹 Cleaning up invalid token: ${failure.device}`);

          // ✅ Automatically remove the dead token from your DB
          await DeviceToken.deleteOne({ deviceToken: failure.device });
        }
      }
    }

    console.log(
      "✅ Push Result:",
      deviceToken,
      title,
      message,
      payload,
      customBundleId,
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    console.error("❌ Error sending push:", error);
    throw error;
  }
}

module.exports = { sendIOSPush };
