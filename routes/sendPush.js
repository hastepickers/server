// utils/sendPush.js
const apn = require("apn");
const path = require("path");

const sendPushNotification = async (deviceToken, message) => {
  const apnProvider = new apn.Provider({
    token: {
      key: path.resolve(__dirname, "../certs/AuthKey_5ZG98B43BM.p8"), // path to your .p8 file
      keyId: "5ZG98B43BM",
      teamId: "N2D98T6FJ5",
    },
    production: false, // Set to true for App Store apps
  });

  const notification = new apn.Notification({
    alert: message,
    topic: "com.pickars.app", // your app’s bundle identifier
    sound: "default",
    pushType: "alert",
  });

  try {
    const result = await apnProvider.send(notification, deviceToken);
    console.log("✅ Push notification result:", result);
    apnProvider.shutdown();
    return result;
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
    apnProvider.shutdown();
    throw error;
  }
};

module.exports = sendPushNotification;
