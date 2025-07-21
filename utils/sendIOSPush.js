const apn = require("apn");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const isProd = process.env.NODE_ENV === "production";

function createApnProvider(keyPath, keyId, teamId) {
  const key = fs.readFileSync(path.resolve(keyPath), "utf8");
  return new apn.Provider({
    token: { key, keyId, teamId },
    production: isProd,
  });
}

const customerApnProvider = createApnProvider(
  process.env.APN_KEY_PATH,
  process.env.KEY_ID,
  process.env.TEAM_ID
);
const customerBundleId = process.env.BUNDLE_ID;

const driverApnProvider = createApnProvider(
  process.env.DRIVER_APN_KEY_PATH,
  process.env.DRIVER_KEY_ID,
  process.env.TEAM_ID
);
const driverBundleId = process.env.DRIVER_BUNDLE_ID;

async function sendCustomerPush(deviceToken, title, message, payload = {}) {
  return sendPushNotification(
    customerApnProvider,
    customerBundleId,
    deviceToken,
    title,
    message,
    payload
  );
}

async function sendDriverPush(deviceToken, title, message, payload = {}) {
  return sendPushNotification(
    driverApnProvider,
    driverBundleId,
    deviceToken,
    title,
    message,
    payload
  );
}

async function sendPushNotification(
  provider,
  bundleId,
  deviceToken,
  title,
  message,
  payload
) {
  try {
    const notification = new apn.Notification();
    notification.alert = { title, body: message };
    notification.sound = "default";
    notification.topic = bundleId;
    if (Object.keys(payload).length > 0) {
      notification.payload = payload;
    }
    const tokens = Array.isArray(deviceToken) ? deviceToken : [deviceToken];
    const result = await provider.send(notification, tokens);
    console.log(
      `✅ Push sent to ${bundleId}:`,
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    console.error(`❌ Error sending push to ${bundleId}:`, error);
    throw error;
  }
}

module.exports = { sendCustomerPush, sendDriverPush };
