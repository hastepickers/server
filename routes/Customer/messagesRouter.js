const express = require("express");
const {
  getMessagesForUser,
  getMessagesByGroupId,
} = require("../../controllers/Customer/messagesController");

const router = express.Router();

// Route to fetch all messages for a user
router.get("/support/messages/customer/:userId", getMessagesForUser);
router.get("/driver/rides/messages/:groupId", getMessagesByGroupId);

module.exports = router;
