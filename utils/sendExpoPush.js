const { Expo } = require("expo-server-sdk");
let expo = new Expo();

async function sendPushNotification(pushToken, message, data = {}) {
  // 🛡️ Validate Token
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`❌ Invalid Expo push token: ${pushToken}`);
    return;
  }

  // ✅ Extract title from data or provide a default
  const title = data.title || "Pickars Update";

  let messages = [
    {
      to: pushToken,
      sound: "default",
      title: title, // 🚀 REQUIRED for the banner to show correctly
      body: message, // The main text
      data: data, // Hidden background data
      priority: "high", // Ensures delivery even if the phone is idling
      channelId: "default", // Required for Android 8.0+
    },
  ];

  console.log(
    `📡 Attempting to send Expo push to: ${pushToken.substring(0, 15)}...`
  );

  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];

  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log("🎫 Expo Ticket Result:", ticketChunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("🔥 Expo Chunk Error:", error);
    }
  }

  return tickets;
}

module.exports = { sendPushNotification };
