const DriversMessage = require("../../models/Customer/DriversMessage");
const MessageSupport = require("../../models/Customer/MessageSupport");

// Controller method to fetch messages for a user
const getMessagesForUser = async (req, res) => {
  const userId = req.user.id;
  try {
    // Find the MessageSupport document for the given userId
    const supportChat = await MessageSupport.findOne({ userId });

    // If no chat is found, respond with a message indicating no data
    if (!supportChat) {
      return res
        .status(404)
        .json({ message: `No messages found for user ${userId}` });
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

// Controller method to fetch messages by groupId
const getMessagesByGroupId = async (req, res) => {
  const { groupId } = req.params; // Extract groupId from URL parameters

  try {
    // Find the document with the matching groupId
    const driversMessage = await DriversMessage.findOne({ groupId });

    if (!driversMessage) {
      return res
        .status(404)
        .json({ message: "No messages found for this groupId." });
    }

    // Return the messages associated with the groupId
    return res.status(200).json(driversMessage.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res
      .status(500)
      .json({ message: "Server error while fetching messages." });
  }
};

// Export all methods
module.exports = {
  getMessagesForUser,
  getMessagesByGroupId
};