const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const User = require("./User"); // Adjust the path as needed

const RIDE_CANCELLATION_WINDOW = 20 * 60 * 1000; // 20 minutes

// Generate a custom pickup code
function generateCustomPickupCode(firstName = "USER") {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${firstName.split(" ")[0]}-${code}`.toUpperCase();
}

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
        parcelId: {
          type: String,
          default: () => Math.random().toString(36).substr(2, 12).toUpperCase(),
        },
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
        deliveryCode: { type: String },
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
      pickupCode: { type: String },
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

// PRE-SAVE MIDDLEWARE
requestARideSchema.pre("save", async function (next) {
  try {
    // Auto-cancel logic
    if (!this.acceptRide && this.createdAt) {
      const threshold = new Date(Date.now() - RIDE_CANCELLATION_WINDOW);
      if (this.createdAt < threshold) {
        this.cancelRide.isCancelled = true;
        this.cancelRide.timestamp = Date.now();
        this.startRide.isStarted = false;
        this.endRide.isEnded = false;
      }
    }

    // Check if pickupCode generation is needed
    if (this.customer && this.customer.customerId) {
      const user = await User.findById(this.customer.customerId);

      if (user && user.pickupCode) {
        const firstName = this.customer?.firstName || "USER";

        // Generate pickupCode if not already present
        if (!this.pickup.pickupCode) {
          this.pickup.pickupCode = generateCustomPickupCode(firstName);
        }

        // Apply same code to delivery dropoffs if needed
        if (Array.isArray(this.deliveryDropoff)) {
          this.deliveryDropoff.forEach((drop) => {
            if (!drop.deliveryCode) {
              drop.deliveryCode = this.pickup.pickupCode;
            }
          });
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// STATIC METHOD TO CANCEL UNACCEPTED RIDES
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

    console.log(`${result.modifiedCount} ride(s) updated to cancelled.`);
  } catch (err) {
    console.error("Error cancelling old rides:", err);
  }
};

const RequestARide = mongoose.model("RequestARide", requestARideSchema);
module.exports = RequestARide;
