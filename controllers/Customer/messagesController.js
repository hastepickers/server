const DriversMessage = require("../../models/Customer/DriversMessage");
const MessageSupport = require("../../models/Customer/MessageSupport");

const getMessagesForUser = async (req, res) => {
  const { userId } = req.params;
  try {
    // Find the MessageSupport document for the given userId
    let supportChat = await MessageSupport.findOne({ userId });

    // If no chat is found, create a new one
    if (!supportChat) {
      supportChat = new MessageSupport({ userId, messages: [] });
      await supportChat.save();
      return;
    }

    // If chat exists, return the messages
    return res.status(200).json(supportChat.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while fetching messages." });
  }
};

const getMessagesByGroupId = async (req, res) => {
  const { groupId } = req.params; // Extract groupId from URL parameters

  try {
    // Find the document with the matching groupId
    const driversMessage = await DriversMessage.findOne({ groupId });

    if (!driversMessage) {
      return res
        .status(404)
        .json({
          success: false,
          status: 404,
          message: "No messages found for this groupId.",
        });
    }

    // Check if messages array is empty
    if (driversMessage.messages.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          status: 404,
          message: "No messages available for this groupId.",
        });
    }

    // Return the messages associated with the groupId
    return res
      .status(200)
      .json({ success: true, status: 200, messages: driversMessage.messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res
      .status(500)
      .json({
        success: false,
        status: 500,
        message: "Server error while fetching messages.",
      });
  }
};
// Export all methods
module.exports = {
  getMessagesForUser,
  getMessagesByGroupId,
};
