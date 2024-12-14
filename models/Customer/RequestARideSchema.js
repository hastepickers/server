const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const requestARideSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      default: uuidv4, // Generate a unique UUID for each ride request
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
    totalPrice: { type: Number, required: false },
    discountedPrice: {
      type: Number,
      required: false,
      default: function () {
        return this.deliveryDropoff.length > 1
          ? this.totalPrice * 0.9
          : this.totalPrice;
      },
    },
    pickup: {
      id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      pickupLatitude: { type: Number, required: true },
      pickupLongitude: { type: Number, required: true },
      pickupAddress: { type: String, required: true },
      pickupTime: { type: Date, required: false },
    },
    arrivalTime: { type: Date, required: false },

    typeOfVehicle: {
      // id: { type: mongoose.Schema.Types.ObjectId, required: false },
      name: { type: String, required: false },
      bikePrice: { type: Number, required: false },
    },
    rider: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
      firstName: { type: String, required: false },
      lastName: { type: String, required: false },
      plateNumber: { type: String, required: false },
      imageUrl: { type: String, required: false },
      phoneNumber: { type: String, required: false },
      driverRating: {
        rating: { type: Number, min: 0, max: 5, default: 0 },
        numberOfReviews: { type: Number, default: 0 },
      },
      riderLocation: {
        ridersLatitude: { type: Number, required: false },
        ridersLongitude: { type: Number, required: false },
        ridersAddress: { type: String, required: false },
      },
    },
    customer: {
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      firstName: { type: String, required: false },
      lastName: { type: String, required: false },
      phoneNumber: { type: String, required: false },
      imageUrl: { type: String, required: false },
    },
    reportThisRide: { type: Boolean, default: false },
    reported: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: false,
        },
        title: { type: String, required: false },
        description: { type: String, required: false },
        timeOfReport: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["resolved", "unresolved"],
          default: "unresolved",
        },
      },
    ],
    isRated: { type: Boolean, default: false },
   
    acceptRide: { type: Boolean, default: false },
    cancelRide: {
      isCancelled: { type: Boolean, default: false },
      timestamp: { type: Date, required: false },
    },
    startRide: {
      isStarted: { type: Boolean, default: false },
      timestamp: { type: Date, required: false },
    },
    endRide: {
      isEnded: { type: Boolean, default: false },
      timestamp: { type: Date, required: false },
    },
    paid: {
      isPaid: { type: Boolean, default: false },
      timestamp: { type: Date, required: false },
      paymentMethod: {
        type: String,
        enum: ["cash", "card", "transfer"],
        required: false,
      },
      paymentService: { type: String, enum: ["100pay"], required: false },
    },
  },
  { timestamps: true }
);

const RequestARide = mongoose.model("RequestARide", requestARideSchema);
module.exports = RequestARide;
