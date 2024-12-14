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
  smsNotifications: { type: Boolean, default: true }, // New field for SMS notifications
  emailNotifications: { type: Boolean, default: true }, // New field for email notifications
  promoCode: { type: String, sparse: true } // Use `sparse` to ignore null values in unique constraint
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

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

const User = mongoose.model("User", userSchema);
module.exports = User;