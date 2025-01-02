const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, lowercase: true },
  lastName: { type: String, required: true, trim: true, lowercase: true },
  phoneNumber: { type: String, required: true, unique: true, trim: true },
  countryCode: { type: String, required: true },
  email: { type: String, required: false },
  referralCode: { type: String, required: false },
  imageUrl: { type: String, required: false },
  password: { type: String, required: false },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  pushNotifications: { type: Boolean, default: true },
  newsletterSubscription: { type: Boolean, default: true },
  promotionNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: true },
  emailNotifications: { type: Boolean, default: true },
  promoCode: { type: String, sparse: true },
  rank: {
    type: String,
    enum: ["Stepper", "Buddy", "Big Stepper", "Governor"],
    default: "Stepper",
  },
  rideCount: { type: Number, default: 0 },  // New rideCount field to store the ride count
});

// Automatically hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to generate promo code
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

// Pre-save hook to generate promo code if new user
userSchema.pre("save", async function (next) {
  if (this.isNew && !this.promoCode) {
    this.promoCode = await this.generatePromoCode();
  }
  next();
});

// Update ride count when the user finishes a ride
userSchema.methods.updateRideCount = async function () {
  const rideCount = await RequestARide.countDocuments({
    "customer.customerId": this._id,
    "endRide.isEnded": true
  });
  this.rideCount = rideCount;
  await this.save();
};

// Middleware to update user object immediately when changes are made
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

// Post-save hook to track ride count after saving
userSchema.post("save", async function (doc, next) {
  if (doc.endRide.isEnded) {
    await doc.updateRideCount(); // Update ride count after a ride ends
  }
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;