const User = require("../../models/Customer/User");
const DeviceToken = require("../../models/DeviceToken");
const { sendEmail } = require("../../utils/emailUtils");
const { notificationTexts } = require("../../utils/notificationTexts");
const { sendCustomerPush } = require("../../utils/sendIOSPush");
const generateRideNotification = require("./generateRideNotification");

const notifyUsers = async (updatedRide, status) => {
  try {
    const {
      title,
      message,
      payload: pushPayload,
    } = notificationTexts(updatedRide)[status];

    // ✅ Generate customer-specific email
    const customerHtmlEmail = await generateRideNotification(
      updatedRide,
      status,
      "customer"
    );

    const sendToUser = async (userId, email, htmlContent) => {
      if (!userId) return;

      // ✅ Push Notification
      const tokens = await DeviceToken.find({ userId });
      if (tokens.length > 0) {
        const deviceTokens = tokens.map((t) => t.deviceToken);
        await Promise.all(
          deviceTokens.map((token) =>
          sendCustomerPush(token, title, message, pushPayload)
          )
        );
      }

      // ✅ Email
      if (email && htmlContent) {
        await sendEmail(email, title, message, htmlContent);
        console.log(`✅ Email sent to ${email} for status: ${status}`);
      }
    };

    // ✅ Notify Customer (with total price)
    await sendToUser(
      updatedRide.customer?.customerId,
      updatedRide.customer?.email,
      customerHtmlEmail
    );

    // ✅ Notify Receivers (without total price)
    for (const drop of updatedRide.deliveryDropoff || []) {
      if (drop.receiverUserId) {
        const receiverUser = await User.findById(drop.receiverUserId);
        if (receiverUser?.email) {
          const receiverHtmlEmail = await generateRideNotification(
            updatedRide,
            status,
            "receiver"
          );
          await sendToUser(
            drop.receiverUserId,
            receiverUser.email,
            receiverHtmlEmail
          );
        }
      }
    }

    console.log(`✅ Notifications sent for status: ${status}`);
  } catch (error) {
    console.error(`❌ Error in notifyUsers for status ${status}:`, error);
  }
};

module.exports = notifyUsers;
