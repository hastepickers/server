const apn = require("apn");
const path = require("path");

// Replace with your actual values
const deviceToken =
  "004ac37439369b3a3047583a9fd08d0fe950885ce93c27d95523dcaf441dc9d9";
const authKeyPath = path.resolve(__dirname, "../certs/AuthKey_5ZG98B43BM.p8"); // Your .p8 file
const keyId = "5ZG98B43BM"; // From Apple Developer
const teamId = "N2D98T6FJ5"; // From Apple Developer
const bundleId = "com.pickars.app"; // Your app's bundle ID

// Configure APNs
const options = {
  token: {
    key: authKeyPath, // Path to the .p8 file
    keyId: keyId,
    teamId: teamId,
  },
  production: true, // false for sandbox, true for production
};

const apnProvider = new apn.Provider(options);

// Create the notification
const notification = new apn.Notification();
notification.alert = {
  title: "Hello from Node.js 🚀",
  body: "This is a test push notification from your local server. This is a test push notification from your local server.This is a test push notification from your local server.",
};
notification.sound = "default";
notification.topic = bundleId; // Must match the app's bundle identifier in Apple Developer

// Send the notification
apnProvider.send(notification, deviceToken).then((response) => {
  console.log("APNs Response:", JSON.stringify(response, null, 2));
  apnProvider.shutdown();
});
