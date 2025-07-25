const mongoose = require("mongoose");
const crypto = require("crypto");

const recentDeliveryLocationSchema = new mongoose.Schema(
  {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    usedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const receivingItemSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RequestARide",
      required: true,
    },
    deliveryCode: { type: String, required: true },
    deliveryLocation: {
      address: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    pickup: {
      senderName: { type: String, required: true },
      senderPhoneNumber: { type: String, required: true },
      pickupAddress: { type: String, required: true },
    },
    rideStatus: {
      isEnded: { type: Boolean, default: false },
    },
    receivedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, lowercase: true },
  lastName: { type: String, required: true, trim: true, lowercase: true },
  phoneNumber: { type: String, required: true, unique: true, trim: true },
  countryCode: { type: String, required: true },
  email: { type: String, required: false },
  referralCode: { type: String, required: false },
  imageUrl: { type: String, required: false },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  pushNotifications: { type: Boolean, default: true },
  newsletterSubscription: { type: Boolean, default: true },
  promotionNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: true },
  emailNotifications: { type: Boolean, default: true },
  promoCode: { type: String },
  pickupCode: { type: Boolean, default: false },

  // ✅ OTP Locking Mechanism
  loginLock: { type: Boolean, default: false },
  loginLockUntil: { type: Date, default: null }, // Unlock after 5 hrs

  rank: {
    type: String,
    enum: ["Stepper", "Buddy", "Big Stepper", "Governor"],
    default: "Stepper",
  },
  rideCount: { type: Number, default: 0 },

  recentDeliveryLocations: {
    type: [recentDeliveryLocationSchema],
    default: [],
    validate: {
      validator: function (v) {
        return v.length <= 5;
      },
      message: "You can only store up to 5 recent delivery locations.",
    },
  },

  receivingItems: {
    type: [receivingItemSchema],
    default: [],
  },
});

// ✅ Methods
userSchema.methods.addRecentDeliveryLocation = function (location) {
  this.recentDeliveryLocations = this.recentDeliveryLocations.filter(
    (loc) =>
      loc.address !== location.address ||
      loc.latitude !== location.latitude ||
      loc.longitude !== location.longitude
  );

  this.recentDeliveryLocations.unshift({
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    usedAt: new Date(),
  });

  this.recentDeliveryLocations = this.recentDeliveryLocations.slice(0, 5);
};

userSchema.methods.addReceivingItem = function (receivingItemData) {
  this.receivingItems.unshift({
    rideId: receivingItemData.rideId,
    deliveryCode: receivingItemData.deliveryCode,
    deliveryLocation: {
      address: receivingItemData.deliveryLocation.address,
      latitude: receivingItemData.deliveryLocation.latitude,
      longitude: receivingItemData.deliveryLocation.longitude,
    },
    pickup: {
      senderName: receivingItemData.pickup.senderName,
      senderPhoneNumber: receivingItemData.pickup.senderPhoneNumber,
      pickupAddress: receivingItemData.pickup.pickupAddress,
    },
    rideStatus: { isEnded: receivingItemData.rideStatus.isEnded },
    createdAt: receivingItemData.createdAt,
    receivedAt: new Date(),
  });
};

userSchema.methods.generatePromoCode = async function () {
  const baseCode = this.firstName + Math.random().toString(36).substr(2, 5);
  const hash = crypto
    .createHash("sha256")
    .update(baseCode)
    .digest("hex")
    .substr(0, 10)
    .toUpperCase();
  return hash;
};

userSchema.pre("save", async function (next) {
  if (this.isNew && !this.promoCode) {
    this.promoCode = await this.generatePromoCode();
  }
  next();
});

userSchema.methods.updateRideCount = async function () {
  const rideCount = await RequestARide.countDocuments({
    "customer.customerId": this._id,
    "endRide.isEnded": true,
  });
  this.rideCount = rideCount;
  await this.save();
};

userSchema.pre("save", function (next) {
  const fieldsToTrack = [
    "pushNotifications",
    "newsletterSubscription",
    "promotionNotifications",
    "smsNotifications",
    "emailNotifications",
  ];

  fieldsToTrack.forEach((field) => {
    if (this.isModified(field)) {
      this[field] = this[field];
    }
  });

  next();
});

userSchema.post("save", async function (doc, next) {
  if (doc.endRide && doc.endRide.isEnded) {
    await doc.updateRideCount();
  }
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
