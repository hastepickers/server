const User = require("../../models/Customer/User");
const DeviceToken = require("../../models/DeviceToken");
const { sendEmail } = require("../../utils/emailUtils");
const { notificationTexts } = require("../../utils/notificationTexts");
const { sendIOSPush } = require("../../utils/sendIOSPush");
const generateRideNotification = require("./generateRideNotification");

const ADMIN_EMAIL = "ikennaibenemee@gmail.com"; // ✅ Admin monitoring email

const notifyUsers = async (updatedRide, status) => {
  try {
    console.log("🚀 notifyUsers called with status:", status);

    // ✅ Generate notification text content
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

    const sendToUser = async (userId, email, htmlContent, isAdmin = false) => {
      // ✅ Push Notification (Skip for Admin monitoring email)
      if (userId && !isAdmin) {
        const tokens = await DeviceToken.find({ userId });
        if (tokens.length > 0) {
          const deviceTokens = tokens.map((t) => t.deviceToken);
          await Promise.all(
            deviceTokens.map(async (token) => {
              await sendIOSPush(
                token,
                title,
                message,
                pushPayload,
                process.env.BUNDLE_ID
              );
            })
          );
        }
      }

      // ✅ Email
      if (email && htmlContent) {
        const emailTitle = isAdmin ? `[ADMIN COPY] ${title}` : title; // Add tag if it's for Ikenna
        await sendEmail(email, emailTitle, message, htmlContent);
        console.log(`✅ Email sent to ${email} for status: ${status}`);
      }
    };

    // ✅ 1. Notify Customer
    await sendToUser(
      updatedRide.customer?.customerId,
      updatedRide.customer?.email,
      customerHtmlEmail
    );

    // ✅ 2. MONITORING: Send update to Ikenna (Admin)
    // We reuse the customerHtmlEmail so he sees exactly what the user sees
    console.log(`📡 Mirroring notification to Admin: ${ADMIN_EMAIL}`);
    await sendToUser(null, ADMIN_EMAIL, customerHtmlEmail, true);

    // ✅ 3. Notify Receivers
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

    console.log(
      `✅ All notifications (including Admin copy) sent for status: ${status}`
    );
  } catch (error) {
    console.error(`❌ Error in notifyUsers for status ${status}:`, error);
  }
};

module.exports = notifyUsers;
