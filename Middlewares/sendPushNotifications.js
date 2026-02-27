const DeviceToken = require("../models/DeviceToken");
const { sendPushNotification } = require("../utils/sendExpoPush");
const { sendIOSPush } = require("../utils/sendIOSPush");

const sendUniversalMessage = async (userId, title, message, payload = {}) => {
  try {
    console.log("------------------------------------------");
    console.log(`📣 MESSAGING START | Target: ${userId || "📢 BROADCAST ALL"}`);

    let devices = [];

    // 1. Find target device tokens
    if (userId) {
      devices = await DeviceToken.find({ userId });
      // 🕵️ Debug: Log exactly what was found for this specific user
      if (devices.length > 0) {
        devices.forEach((d) => {
          console.log(
            `👤 User Found | Platform: [${
              d.platform
            }] | Token: ${d.deviceToken.substring(0, 20)}...`
          );
        });
      }
    } else {
      devices = await DeviceToken.find();
      console.log(
        `📢 Broadcast Mode: Found ${devices.length} total devices in DB.`
      );
    }

    if (devices.length === 0) {
      console.warn(
        "⚠️ No active device tokens found in DB. Messaging aborted."
      );
      return { success: false, totalDevices: 0 };
    }

    // 2. Separate tokens and log the counts
    const iosTokens = devices
      .filter((d) => d.platform === "ios")
      .map((d) => d.deviceToken);
    const androidTokens = devices
      .filter((d) => d.platform === "android")
      .map((d) => d.deviceToken);

    console.log(
      `📊 Distribution: iOS [${iosTokens.length}] | Android [${androidTokens.length}]`
    );

    const sendResults = [];

    // 3. Process iOS Native (APNs)
    if (iosTokens.length > 0) {
      console.log(`🍎 Initializing APNs for ${iosTokens.length} device(s)...`);
      console.log(`📝 Content: ${title} - ${message}`);

      const iosResult = await sendIOSPush(
        iosTokens,
        title,
        message,
        payload,
        process.env.BUNDLE_ID
      );

      // 🍏 Detailed logging for iOS results
      console.log(
        `🍏 APNs Raw Response: ${JSON.stringify(iosResult, null, 2)}`
      );
      sendResults.push({ platform: "ios", result: iosResult });
    }

    // 4. Process Android/Other (Expo)
    if (androidTokens.length > 0) {
      console.log(
        `🤖 Initializing Expo for ${androidTokens.length} device(s)...`
      );
      const androidResults = await Promise.all(
        androidTokens.map(async (token) => {
          try {
            console.log(
              `📲 Sending to Android Token: ${token.substring(0, 15)}...`
            );
            const res = await sendPushNotification(token, message, {
              title,
              ...payload,
            });
            console.log(`✅ Expo Success for ${token.substring(0, 10)}`);
            return res;
          } catch (err) {
            console.error(
              `❌ Expo Fail for ${token.substring(0, 10)}:`,
              err.message
            );
            return { error: err.message, token };
          }
        })
      );
      sendResults.push({ platform: "android", result: androidResults });
    }

    console.log("🏁 Messaging pipeline finished.");
    console.log("------------------------------------------");

    return {
      success: true,
      totalDevices: devices.length,
      iosCount: iosTokens.length,
      androidCount: androidTokens.length,
      rawResults: sendResults, // Passing this back so the controller can see errors
    };
  } catch (error) {
    console.error("🔥 CRITICAL MESSAGING UTILITY ERROR:", error.stack);
    throw error;
  }
};

module.exports = { sendUniversalMessage };
