const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  userId: { type: String, required: false },
  message: { type: String, required: false },
  sender: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, required: false },
  read: { type: Boolean, required: false },
  delivered: { type: Boolean, required: false },
  seenSupport: { type: Boolean, required: false },
  seenCustomer: { type: Boolean, required: false },
});

const MessageSupportSchema = new mongoose.Schema({
  messages: [messageSchema],
  userId: { type: String, required: true },
  createdTicket: { type: Boolean, default: false },
  endedChate: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("MessageSupport", MessageSupportSchema);
