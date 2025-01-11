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
      pickupLatitude: { type: Number, required: true },
      pickupLongitude: { type: Number, required: true },
      pickupAddress: { type: String, required: true },
      pickupTime: { type: Date, required: false },
    },
    deliveryDropoff: [
      {
        id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        deliveryLatitude: { type: Number, required: true },
        deliveryLongitude: { type: Number, required: true },
        deliveryAddress: { type: String, required: true },
        parcelId: {
          type: String,
          required: false,
          default: function () {
            return Math.random().toString(36).substr(2, 12).toUpperCase(); // Generate random parcel ID
          },
        },
        receiverName: { type: String, required: true },
        receiverPhoneNumber: { type: String, required: true },
        receiverUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: false,
        },
        items: [
          {
            itemName: { type: String, required: true },
          },
        ],
        price: { type: Number, required: false },
      },
    ],
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
