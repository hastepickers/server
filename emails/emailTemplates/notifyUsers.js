const User = require("../../models/Customer/User");
const DeviceToken = require("../../models/DeviceToken");
const { sendEmail } = require("../../utils/emailUtils");
const { notificationTexts } = require("../../utils/notificationTexts");
const { sendIOSPush } = require("../../utils/sendIOSPush");
const generateRideNotification = require("./generateRideNotification");

const notifyUsers = async (updatedRide, status) => {
  try {
    console.log("🚀 notifyUsers called with status:", status);
    console.log("📦 updatedRide:", JSON.stringify(updatedRide, null, 2));

    // ✅ Generate notification text content
    const {
      title,
      message,
      payload: pushPayload,
    } = notificationTexts(updatedRide)[status];
    console.log("✅ Notification Texts ->", { title, message, pushPayload });

    // ✅ Generate customer-specific email
    const customerHtmlEmail = await generateRideNotification(
      updatedRide,
      status,
      "customer"
    );
    console.log("✅ Customer Email HTML generated");

    const sendToUser = async (userId, email, htmlContent) => {
      console.log("🔍 sendToUser called with:", { userId, email });

      if (!userId) {
        console.log("⚠️ No userId provided, skipping...");
        return;
      }

      // ✅ Push Notification
      console.log("🔍 Finding device tokens for userId:", userId);
      const tokens = await DeviceToken.find({ userId });
      console.log("✅ Tokens found:", tokens);

      if (tokens.length > 0) {
        const deviceTokens = tokens.map((t) => t.deviceToken);
        console.log("✅ Sending push notifications to tokens:", deviceTokens);

        await Promise.all(
          deviceTokens.map(async (token) => {
            console.log(`📲 Sending push to token: ${token}`);
            await sendIOSPush(
              token,
              title,
              message,
              pushPayload,
              process.env.BUNDLE_ID
            );
            console.log(`✅ Push sent to token: ${token}`);
          })
        );
      } else {
        console.log(`⚠️ No device tokens found for userId: ${userId}`);
      }

      // ✅ Email
      if (email && htmlContent) {
        console.log(`📧 Sending email to ${email}`);
        await sendEmail(email, title, message, htmlContent);
        console.log(`✅ Email sent to ${email} for status: ${status}`);
      } else {
        console.log(`⚠️ No email or HTML content for userId: ${userId}`);
      }
    };

    // ✅ Notify Customer
    console.log("🔍 Notifying customer...");
    await sendToUser(
      updatedRide.customer?.customerId,
      updatedRide.customer?.email,
      customerHtmlEmail
    );

    // ✅ Notify Receivers
    console.log("🔍 Checking for receivers...");
    for (const drop of updatedRide.deliveryDropoff || []) {
      console.log("📦 Drop info:", drop);

      if (drop.receiverUserId) {
        console.log(`🔍 Fetching receiver user: ${drop.receiverUserId}`);
        const receiverUser = await User.findById(drop.receiverUserId);
        console.log("✅ Receiver user:", receiverUser);

        if (receiverUser?.email) {
          console.log(`📧 Preparing email for receiver: ${receiverUser.email}`);
          const receiverHtmlEmail = await generateRideNotification(
            updatedRide,
            status,
            "receiver"
          );
          console.log("✅ Receiver email HTML generated");

          await sendToUser(
            drop.receiverUserId,
            receiverUser.email,
            receiverHtmlEmail
          );
        } else {
          console.log(`⚠️ Receiver has no email: ${drop.receiverUserId}`);
        }
      }
    }

    console.log(`✅ All notifications sent for status: ${status}`);
  } catch (error) {
    console.error(`❌ Error in notifyUsers for status ${status}:`, error);
  }
};

module.exports = notifyUsers;
