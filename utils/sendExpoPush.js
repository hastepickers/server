const { Expo } = require("expo-server-sdk");
let expo = new Expo();

async function sendPushNotification(pushToken, message, data = {}) {
  if (!Expo.isExpoPushToken(pushToken)) {
    throw new Error(`Invalid Expo push token: ${pushToken}`);
  }

  let messages = [
    {
      to: pushToken,
      sound: "default",
      body: message,
      data,
    },
  ];

  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];

  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  return tickets;
}

module.exports = { sendPushNotification };