const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const requestARideSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      default: uuidv4,
    },

    deliveryDropoff: [
      {
        id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        deliveryLatitude: { type: Number, required: true },
        deliveryLongitude: { type: Number, required: true },
        deliveryAddress: { type: String, required: true },
        parcelId: { type: String }, // set from route
        deliveryCode: { type: String }, // set from route
        receiverName: { type: String, required: true },
        receiverPhoneNumber: { type: String, required: true },
        receiverUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        items: [
          {
            itemName: { type: String, required: true },
          },
        ],
        price: { type: Number },
      },
    ],

    totalPrice: { type: Number },
    discountedPrice: {
      type: Number,
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
      pickupTime: { type: Date },
      pickupCode: { type: String }, // set from route
    },

    arrivalTime: { type: Date },

    typeOfVehicle: {
      name: { type: String },
      bikePrice: { type: Number },
    },

    rider: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      firstName: { type: String },
      lastName: { type: String },
      plateNumber: { type: String },
      imageUrl: { type: String },
      phoneNumber: { type: String },
      driverRating: {
        rating: { type: Number, min: 0, max: 5, default: 0 },
        numberOfReviews: { type: Number, default: 0 },
      },
      riderLocation: {
        ridersLatitude: { type: Number },
        ridersLongitude: { type: Number },
        ridersAddress: { type: String },
      },
      vehicleType: { type: String },
      vehicleName: { type: String },
      vehicleColor: { type: String },
    },

    customer: {
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      email: { type: String },
      firstName: { type: String },
      lastName: { type: String },
      phoneNumber: { type: String },
      imageUrl: { type: String },
    },

    reportThisRide: { type: Boolean, default: false },
    reported: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        title: { type: String },
        description: { type: String },
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
      timestamp: { type: Date },
    },

    startRide: {
      isStarted: { type: Boolean, default: false },
      timestamp: { type: Date },
    },

    endRide: {
      isEnded: { type: Boolean, default: false },
      timestamp: { type: Date },
    },

    paid: {
      isPaid: { type: Boolean, default: false },
      timestamp: { type: Date, default: Date.now },
      paymentMethod: {
        type: String,
        enum: ["cash", "card", "transfer"],
        default: "card",
      },
      paymentService: {
        type: String,
        enum: ["paystack"],
        default: "paystack",
      },
      details: {
        id: { type: String },
        domain: { type: String },
        status: { type: String, default: "pending" },
        reference: { type: String },
        receipt_number: { type: String, default: null },
        amount: { type: Number },
        message: { type: String, default: null },
        gateway_response: { type: String },
        paid_at: { type: Date },
        created_at: { type: Date },
        channel: { type: String },
        currency: { type: String },
        authorization: {
          authorization_code: { type: String },
          bin: { type: String },
          last4: { type: String },
          exp_month: { type: String },
          exp_year: { type: String },
          channel: { type: String },
          card_type: { type: String },
          bank: { type: String },
          country_code: { type: String },
          brand: { type: String },
          reusable: { type: Boolean },
          signature: { type: String },
          account_name: { type: String, default: null },
        },
        customer: {
          id: { type: Number },
          first_name: { type: String, default: null },
          last_name: { type: String, default: null },
          email: { type: String },
          customer_code: { type: String },
          phone: { type: String, default: null },
          metadata: { type: String, default: null },
          risk_action: { type: String },
          international_format_phone: { type: String, default: null },
        },
      },
    },
  },
  { timestamps: true }
);

// Optional: auto-cancel logic can remain here if needed
const RIDE_CANCELLATION_WINDOW = 20 * 60 * 1000;
requestARideSchema.statics.cancelUnacceptedRides = async function () {
  const currentTime = Date.now();
  try {
    const result = await this.updateMany(
      {
        acceptRide: false,
        createdAt: { $lt: new Date(currentTime - RIDE_CANCELLATION_WINDOW) },
      },
      {
        $set: {
          "cancelRide.isCancelled": true,
          "cancelRide.timestamp": currentTime,
          "startRide.isStarted": false,
          "endRide.isEnded": false,
        },
      }
    );
    console.log(`${result.modifiedCount} ride(s) auto-cancelled.`);
  } catch (err) {
    console.error("Error auto-cancelling old rides:", err);
  }
};

module.exports = mongoose.model("RequestARide", requestARideSchema);
