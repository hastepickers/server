const { sendPushNotification } = require("../../utils/sendExpoPush");

// Example: Send notification to a single token
const sendNotification = async (req, res) => {
  try {
    const { token, message, userId } = req.body;

    const tickets = await sendPushNotification(token, message, { userId });
    res.json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { sendNotification };
