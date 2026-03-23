const axios = require("axios");

/**
 * Formats Nigerian phone numbers for WhatsApp API
 * @param {string} phone
 * @returns {string} Formatted number with +234
 */
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\s+/g, "").replace(/-/g, ""); // Remove spaces/dashes

  if (cleaned.startsWith("0")) {
    // If starts with 0, remove it and add +234
    return `+234${cleaned.substring(1)}`;
  } else if (cleaned.startsWith("234")) {
    // If starts with 234, just add +
    return `+${cleaned}`;
  } else if (!cleaned.startsWith("+234")) {
    // If it doesn't have the prefix at all, add +234
    return `+234${cleaned}`;
  }

  return cleaned; // Already starts with +234
};

/**
 * Sends WhatsApp message via WAWP API
 * @param {string} phoneNumber - Recipient number
 * @param {string} message - Message content
 */
const sendWhatsApp = async (phoneNumber, message) => {
  try {
    const formattedChatId = formatPhoneNumber(phoneNumber);

    const params = {
      instance_id: "5B90E4EF34C9",
      access_token: "osAG7NmWLwRuc8",
      chatId: formattedChatId,
      message: message,
    };

    console.log(`📱 Sending WhatsApp to ${formattedChatId}...`);

    const response = await axios.get("https://wawp.net/wp-json/awp/v1/send", {
      params,
    });

    if (response.data.status === "success" || response.data.error === false) {
      console.log(`✅ WhatsApp sent to ${formattedChatId}`);
      return response.data;
    } else {
      throw new Error(response.data.message || "WAWP API Error");
    }
  } catch (error) {
    console.error(
      "❌ WhatsApp Sending Failed:",
      error.response?.data || error.message
    );
    // We don't want to crash the whole server if WhatsApp fails
    return null;
  }
};

module.exports = { sendWhatsApp };
