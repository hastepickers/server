const mongoose = require("mongoose");

const RiderSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  countryCode: {
    type: String,
    required: true,
  },
  plateNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  imageUrl: {
    type: String,
    required: false, // Optional imageUrl
  },
  driverRating: {
    rating: {
      type: Number,
      default: 0, // Default rating if none provided
    },
  },
  company: {
    type: String,
    required: false, // Optional company
  },
  active: {
    type: Boolean,
    default: true, // Defaults to active rider
  },
  password: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  pushNotifications: {
    type: Boolean,
    default: true, // Opted-in to push notifications by default
  },
  newsletterSubscription: {
    type: Boolean,
    default: true, // Opted-in to newsletters by default
  },
  promotionNotifications: {
    type: Boolean,
    default: true, // Opted-in to promotion notifications by default
  },
  promoCode: {
    type: String,
    //unique: true,
    //required: false, // Promo code, optional
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  riderLocation: {
    ridersLatitude: { type: Number,  },
    ridersLongitude: { type: Number,  },
    ridersAddress: { type: String,  },
  },
});

const Rider = mongoose.model("Rider", RiderSchema);
module.exports = Rider;
