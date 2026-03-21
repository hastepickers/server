const apn = require("apn");
const path = require("path");
require("dotenv").config();
const fs = require("fs");
const DeviceToken = require("../models/DeviceToken");

// 1. Fix the 'undefined' crash:
// Only call path.resolve if the environment variable actually exists.
const APN_KEY_PATH = process.env.APN_KEY_PATH
  ? path.resolve(process.env.APN_KEY_PATH)
  : null;

const keyId = process.env.KEY_ID;
const teamId = process.env.TEAM_ID;
const defaultBundleId = process.env.BUNDLE_ID; // com.pickars.app
const isProd = process.env.NODE_ENV === "production";

// 2. Validate mandatory variables
if (!keyId || !teamId || !defaultBundleId) {
  console.error(
    "❌ Critical Error: Missing APNs environment variables (KEY_ID, TEAM_ID, or BUNDLE_ID)."
  );
}

let key = process.env.APN_KEY_CONTENT;

if (!key) {
  const localCertPath = path.resolve("certs/AuthKey_5ZG98B43BM.p8");
  if (fs.existsSync(localCertPath)) {
    key = fs.readFileSync(localCertPath, "utf8");
    console.log("✅ Using local .p8 file for APNs");
  } else {
    console.warn("⚠️ No APN_KEY_CONTENT found and no local .p8 file at certs/");
  }
}

// 4. Initialize APN Provider
let apnProvider = null;
if (key && keyId && teamId) {
  try {
    const options = {
      token: {
        key,
        keyId,
        teamId,
      },
      production: isProd, // true for production environment
    };
    apnProvider = new apn.Provider(options);
    console.log(
      `🚀 APNs Provider initialized (${isProd ? "Production" : "Sandbox"})`
    );
  } catch (initError) {
    console.error("❌ Failed to initialize APNs Provider:", initError.message);
  }
}

/**
 * Send iOS Push Notification
 */
async function sendIOSPush(
  deviceToken,
  title,
  message,
  payload = {},
  customBundleId
) {
  if (!apnProvider) {
    console.error("❌ Cannot send push: APN provider not initialized.");
    return { error: "Provider not initialized" };
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

    // 5. Cleanup Dead Tokens
    if (result.failed.length > 0) {
      for (const failure of result.failed) {
        const reason = failure.response?.reason;
        if (reason === "BadDeviceToken" || reason === "Unregistered") {
          console.log(`🧹 Cleaning up invalid token: ${failure.device}`);
          await DeviceToken.deleteOne({ deviceToken: failure.device });
        } else {
          console.warn(`⚠️ Push failed for ${failure.device}: ${reason}`);
        }
      }
    }

    console.log(
      "✅ Push Result for:",
      title,
      "Result:",
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    console.error("❌ Error in sendIOSPush function:", error);
    throw error;
  }
}

module.exports = { sendIOSPush };
