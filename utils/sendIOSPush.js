const apn = require("apn");
const path = require("path");
require("dotenv").config();
const fs = require("fs");
const DeviceToken = require("../models/DeviceToken");

// ✅ FIX: Use a fallback empty string to prevent the "Received undefined" crash
const apnKeyPath = process.env.APN_KEY_PATH || "";
const authKeyPath = apnKeyPath ? path.resolve(apnKeyPath) : null;

const keyId = process.env.KEY_ID;
const teamId = process.env.TEAM_ID;
const defaultBundleId = process.env.BUNDLE_ID; 
const isProduction = process.env.NODE_ENV === "production";

// ✅ Safety Check: Log if variables are missing (but don't crash the whole app)
if (!keyId || !teamId || !defaultBundleId) {
  console.warn("⚠️ APNs environment variables are missing. Push notifications will fail.");
}

// ✅ Production uses the STRING (APN_KEY_CONTENT), Local uses the FILE (AuthKey...)
let key;
if (isProduction) {
  key = process.env.APN_KEY_CONTENT;
  console.log("🚀 APN: Using Key Content from Environment Variables");
} else {
  try {
    const localPath = path.resolve("certs/AuthKey_5ZG98B43BM.p8");
    key = fs.readFileSync(localPath, "utf8");
    console.log("💻 APN: Using Local .p8 File");
  } catch (err) {
    console.error("❌ APN: Local .p8 file not found at certs/AuthKey_5ZG98B43BM.p8");
  }
}

const options = {
  token: {
    key,
    keyId,
    teamId,
  },
  production: isProduction,
};

// Only initialize provider if we actually have a key to avoid crashes
const apnProvider = key ? new apn.Provider(options) : null;

async function sendIOSPush(
  deviceToken,
  title,
  message,
  payload = {},
  customBundleId
) {
  if (!apnProvider) {
    console.error("❌ Cannot send push: APN Provider not initialized.");
    return null;
  }

  try {
    const notification = new apn.Notification();
    notification.alert = { title, body: message };
    notification.sound = "default";
    notification.topic = customBundleId || defaultBundleId;

    if (Object.keys(payload).length > 0) {
      notification.payload = payload;
    }

    const tokens = Array.isArray(deviceToken) ? deviceToken : [deviceToken];
    const result = await apnProvider.send(notification, tokens);

    // Clean up dead tokens
    if (result.failed.length > 0) {
      for (const failure of result.failed) {
        if (["BadDeviceToken", "Unregistered"].includes(failure.response.reason)) {
          console.log(`🧹 Cleaning up invalid token: ${failure.device}`);
          await DeviceToken.deleteOne({ deviceToken: failure.device });
        }
      }
    }

    return result;
  } catch (error) {
    console.error("❌ Error sending push:", error);
    throw error;
  }
}

module.exports = { sendIOSPush };