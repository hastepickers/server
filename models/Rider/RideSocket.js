const mongoose = require("mongoose");

const DeliveryDropoffSchema = new mongoose.Schema({
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
});

const PickupSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  pickupLatitude: { type: Number, required: true },
  pickupLongitude: { type: Number, required: true },
  pickupAddress: { type: String, required: true },
  pickupTime: { type: Date, required: false },
});

const RideSocketSchema = new mongoose.Schema({
  message: { type: String, required: true, default: "Ride booked!" },
  rideDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: true,
  }, // Reference to the Rider schema
  error: { type: Boolean, required: true, default: false },
  rideId: { type: String, required: true, unique: true },
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: true,
  }, // Reference to the Rider schema
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  pickup: { type: PickupSchema, required: true },
  deliveryDropoff: { type: [DeliveryDropoffSchema], required: true },
  status: {
    type: String,
    required: true,
    enum: [
      "pairing",
      "accepted",
      "cancelled",
      "rejected",
      "ongoing",
      "completed",
    ],
    default: "pairing",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Automatically update `updatedAt` before saving
RideSocketSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const RideSocket = mongoose.model("RideSocket", RideSocketSchema);

module.exports = RideSocket;
