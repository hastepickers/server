const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const RIDE_CANCELLATION_WINDOW = 50 * 60 * 1000; // 5 minutes in milliseconds

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
      email: { type: String, required: false },
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
      timestamp: { type: Date, default: Date.now },
      paymentMethod: {
        type: String,
        enum: ["cash", "card", "transfer"],
        default: "card",
      },
      paymentService: { type: String, enum: ["paystack"], default: "paystack" },
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

// Middleware to automatically cancel ride if not accepted within 5 minutes
requestARideSchema.pre("save", async function (next) {
  if (!this.acceptRide && this.createdAt) {
    const fiveMinutesAgo = new Date(Date.now() - RIDE_CANCELLATION_WINDOW);
    if (this.createdAt < fiveMinutesAgo) {
      this.cancelRide.isCancelled = true;
      this.cancelRide.timestamp = Date.now();
      this.startRide.isStarted = false;
      this.endRide.isEnded = false;
    }
  }
  next();
});

// Method to update all unaccepted rides
requestARideSchema.statics.cancelUnacceptedRides = async function () {
  try {
    const currentTime = Date.now();

    // Find and update unaccepted rides that are older than the cancellation window
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

    console.log(`${result.modifiedCount} ride(s) updated to cancelled.`);
  } catch (error) {
    console.error("Error canceling unaccepted rides:", error);
  }
};

const RequestARide = mongoose.model("RequestARide", requestARideSchema);
module.exports = RequestARide;
