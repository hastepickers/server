const mongoose = require("mongoose");

const TypeOfVehicleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  plateNumber: {
    type: String,
    required: true,
  },
  logoUrl: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  ridersId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Assuming you have a User schema for riders
  },
  timeAdded: {
    type: Date,
    default: Date.now,
  },
});

const TypeOfVehicle = mongoose.model("TypeOfVehicle", TypeOfVehicleSchema);

module.exports = TypeOfVehicle;