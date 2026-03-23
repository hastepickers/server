const axios = require("axios");

/**
 * Formats Nigerian phone numbers for WhatsApp chatId (@c.us)
 * @param {string} phone
 * @returns {string} Formatted number like 2348123456789@c.us
 */
const formatForWhatsApp = (phone) => {
  // Remove all non-numeric characters (spaces, +, -, etc.)
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("0") && cleaned.length === 11) {
    // Convert 081... to 23481...
    cleaned = `234${cleaned.substring(1)}`;
  } else if (cleaned.length === 10) {
    // Convert 81... to 23481...
    cleaned = `234${cleaned}`;
  }

  // Ensure it doesn't already have the suffix, then add it
  return cleaned.includes("@c.us") ? cleaned : `${cleaned}@c.us`;
};

/**
 * Sends WhatsApp message via WAWP API
 * @param {string} phoneNumber - Recipient number
 * @param {string} message - Message content
 */
const sendWhatsApp = async (phoneNumber, message) => {
  try {
    // This now returns "2348120710198@c.us"
    const chatId = formatForWhatsApp(phoneNumber);

    const params = {
      instance_id: "5B90E4EF34C9",
      access_token: "osAG7NmWLwRuc8",
      chatId: chatId,
      message: message,
    };

    console.log(`📱 Sending WhatsApp to ${chatId}...`);

    // Note: If your API requires POST instead of GET based on the error log
    // you shared earlier, you might need to switch axios.get to axios.post
    const response = await axios.get("https://wawp.net/wp-json/awp/v1/send", {
      params,
    });

    // Check for success based on WAWP's response structure
    if (response.data.status === "success" || response.data.error === false) {
      console.log(`✅ WhatsApp sent to ${chatId}`);
      return response.data;
    } else {
      throw new Error(response.data.message || "WAWP API Error");
    }
  } catch (error) {
    console.error(
      "❌ WhatsApp Sending Failed:",
      error.response?.data || error.message
    );
    return null;
  }
};

module.exports = { sendWhatsApp };
