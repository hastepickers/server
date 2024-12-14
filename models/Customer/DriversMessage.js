const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  message: { type: String, required: false },
  sender: { type: String, required: false },
  status: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
  uuid: { type: String, required: false }, // Added UUID field
});

const DriversMessageSchema = new mongoose.Schema({
  messages: [messageSchema],
  groupId: { type: String, required: true },
});

module.exports = mongoose.model("DriversMessage", DriversMessageSchema);