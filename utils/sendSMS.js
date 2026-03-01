const axios = require("axios");

const sendSMS = async (to, message) => {
  const url = 'https://v3.api.termii.com/api/sms/send';

  console.log("📨 [SMS] Sending SMS...");
  console.log("➡️ URL:", url);
  console.log("➡️ To:", to);
  console.log("➡️ Message:", message);

  console.log("🔐 ENV VALUES:");
  console.log("TERMII_API_KEY:", process.env.TERMII_API_KEY);
  console.log("TERMII_FROM_NAME:", process.env.TERMII_FROM_NAME);
  console.log("TERMII_SMS_TYPE:", process.env.TERMII_SMS_TYPE);
  console.log("TERMII_SMS_CHANNEL:", process.env.TERMII_SMS_CHANNEL);

  const payload = {
    api_key: process.env.TERMII_API_KEY,
    to,
    from: process.env.TERMII_FROM_NAME,
    sms: message,
    type: process.env.TERMII_SMS_TYPE,
    channel: process.env.TERMII_SMS_CHANNEL,
  };

  console.log("📦 Payload:", payload);

  try {
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ SMS SENT SUCCESSFULLY");
    console.log("📨 Response status:", response.status);
    console.log("📨 Response data:", response.data);

    return response.data;
  } catch (error) {
    console.error("❌ SMS SENDING FAILED");

    if (error.response) {
      console.error("📛 Status:", error.response.status);
      console.error("📛 Data:", error.response.data);
      console.error("📛 Headers:", error.response.headers);
    } else if (error.request) {
      console.error("📛 No response received:", error.request);
    } else {
      console.error("📛 Error message:", error.message);
    }

    console.error("🧨 Full error object:", error);

    throw new Error("Failed to send SMS");
  }
};

module.exports = { sendSMS };
