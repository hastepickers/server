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
    } else {
      devices = await DeviceToken.find();
    }

    if (devices.length === 0) {
      console.log("⚠️ No active device tokens found for this request.");
      return { success: false, sentCount: 0 };
    }

    console.log(`🔍 Found ${devices.length} token(s). Distributing by platform...`);

    // 2. Separate tokens by platform for the correct provider
    const iosTokens = devices.filter(d => d.platform === "ios").map(d => d.deviceToken);
    const androidTokens = devices.filter(d => d.platform === "android").map(d => d.deviceToken);

    const sendResults = [];

    // 3. Process iOS Native (APNs)
    if (iosTokens.length > 0) {
      console.log(`🍎 Routing ${iosTokens.length} tokens to Apple Push Service...`);
      const iosResult = await sendIOSPush(
        iosTokens, 
        title, 
        message, 
        payload, 
        process.env.BUNDLE_ID
      );
      sendResults.push({ platform: "ios", result: iosResult });
    }

    // 4. Process Android/Other (Expo)
    if (androidTokens.length > 0) {
      console.log(`🤖 Routing ${androidTokens.length} tokens to Expo/Android Service...`);
      const androidResults = await Promise.all(
        androidTokens.map(async (token) => {
          try {
            return await sendPushNotification(token, message, { title, ...payload });
          } catch (err) {
            console.error(`❌ Android token failed: ${token.substring(0, 10)}...`, err.message);
            return null;
          }
        })
      );
      sendResults.push({ platform: "android", result: androidResults });
    }

    console.log("✅ All messaging pipelines processed.");
    console.log("------------------------------------------");

    return { 
      success: true, 
      totalDevices: devices.length,
      iosCount: iosTokens.length,
      androidCount: androidTokens.length
    };

  } catch (error) {
    console.error("🔥 CRITICAL UTILS ERROR:", error.message);
    throw error;
  }
};

module.exports = { sendUniversalMessage };