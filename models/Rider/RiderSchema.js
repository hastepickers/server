const mongoose = require("mongoose");

const RiderSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, lowercase: true },
  lastName: { type: String, required: true, trim: true, lowercase: true },
  phoneNumber: { type: String, required: true, unique: true, trim: true },
  countryCode: { type: String, required: true },
  plateNumber: { type: String, required: true, unique: true, trim: true },
  NIN: { type: String, required: true, unique: true, trim: true },
  NINverified: { type: Boolean, default: true },
  imageUrl: { type: String },
  email: { type: String },
  driverRating: {
    rating: { type: Number, default: 0, min: 0, max: 5 },
  },
  vehicleType: { type: String },
  vehicleName: { type: String },
  vehicleColor: { type: String },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  active: { type: Boolean, default: false },
  suspend: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  pushNotifications: { type: Boolean, default: true },
  newsletterSubscription: { type: Boolean, default: true },
  promotionNotifications: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  riderLocation: {
    ridersLatitude: { type: Number },
    ridersLongitude: { type: Number },
    ridersAddress: { type: String, trim: true },
  },
  totalRides: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0.0 },
  totalWithdrawals: { type: Number, default: 0.0 },
  registeredCompanyNumber: { type: String, unique: true },
  businessName: { type: String, trim: true },
  registeredBusinessNumber: { type: String, unique: true },
  withdrawals: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Withdrawal" }, // Reference to Withdrawal
  ],
  earnings: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Earning" }, // Reference to Earning
  ],
  accountDetails: [
    {
      accountNumber: { type: String },
      accountName: { type: String },
      bank: { type: String },
      bankCode: { type: String },
    },
  ],
});

// // Virtual field for dynamic balance calculation
// RiderSchema.virtual("balance").get(function () {
//   // Assume `earnings` and `withdrawals` are populated with their amounts and statuses.
//   const totalEarnings = this.earnings.reduce((sum, earning) => sum + earning.amount, 0);
//   const totalWithdrawals = this.withdrawals
//     .filter((withdrawal) => ["pending", "success"].includes(withdrawal.status))
//     .reduce((sum, withdrawal) => sum + withdrawal.amount, 0);

//   return totalEarnings - totalWithdrawals;
// });

// // Ensure virtuals are included in JSON responses
// RiderSchema.set("toObject", { virtuals: true });
// RiderSchema.set("toJSON", { virtuals: true });

const Rider = mongoose.model("Rider", RiderSchema);
module.exports = Rider;