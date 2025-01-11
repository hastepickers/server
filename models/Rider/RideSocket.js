const mongoose = require("mongoose");

const RideSocketSchema = new mongoose.Schema(
  {
    rideId: {
      type: String,
      required: true,
      unique: true,
    },
    rideDetails: {
      type: Object,
      required: true,
    },
    ride: {
      type: Object,
      required: true,
    },
    driverId: {
      type: String,
      required: true,
    },
    pickup: {
      type: String,
      required: true,
    },
    deliveryDropoff: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "pairing",
      enum: ["pairing", "accepted", "in-progress", "completed", "canceled"],
    },
  },
  { timestamps: true }
);

const RideSocket = mongoose.model("RideSocket", RideSocketSchema);

module.exports = RideSocket;
