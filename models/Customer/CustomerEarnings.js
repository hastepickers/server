const mongoose = require("mongoose");


const withdrawalSchema = new mongoose.Schema({
  accountWithdrawnTo: {
    type: String,
    //required: true,
  },
  amountWithdrawn: {
    type: Number,
    //required: true,
  },
  timeWithdrawn: {
    type: Date,
    default: Date.now,
  },
  id: {
    type: mongoose.Schema.Types.ObjectId,
    //required: true,
  },
  accountName: {
    type: String,
    //required: true,
  },
  bank_code: {
    type: String,
    //required: true,
  },
  country_code: {
    type: String,
    //required: true,
  },
  account_number: {
    type: String,
    //required: true,
  },
  account_type: {
    type: String,
    enum: ["personal", "business"],
    //required: true,
  },
  status: {
    type: String,
    enum: ["success", "failed", "pending"],
    //required: true,
  },
});

const earningSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    //required: true,
  },
  amountEarned: {
    type: Number,
    //required: true,
  },
  rideId: {
    type: String,
    //required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const customerEarningSchema = new mongoose.Schema({
  balance: {
    type: Number,
    default: 0,
  },
  earnings: [earningSchema],
  withdrawals: [withdrawalSchema],
  withdrawalPin: {
    type: String,
    // //required: true,
  },
  userId: { // Change id to userId for clarity
    type: mongoose.Schema.Types.ObjectId,
    required: true, // Make it required if every earning should be linked to a user
    ref: 'User' // Reference to the User model
  },
});

// Method to hash the withdrawal PIN before saving
customerEarningSchema.pre("save", async function (next) {
  if (this.isModified("withdrawalPin")) {
    const salt = await bcrypt.genSalt(10);
    this.withdrawalPin = await bcrypt.hash(this.withdrawalPin, salt);
  }
  next();
});

// Method to verify the withdrawal PIN
customerEarningSchema.methods.verifyWithdrawalPin = async function (pin) {
  return await bcrypt.compare(pin, this.withdrawalPin);
};

// Method to calculate balance
customerEarningSchema.methods.calculateBalance = function () {
  const totalEarnings = this.earnings.reduce(
    (acc, earning) => acc + earning.amountEarned,
    0
  );

  const totalWithdrawals = this.withdrawals
    .filter((withdrawal) => withdrawal.status !== "failed")
    .reduce((acc, withdrawal) => acc + withdrawal.amountWithdrawn, 0);

  return totalEarnings - totalWithdrawals;
};

// Create model
const CustomerEarning = mongoose.model(
  "CustomerEarning",
  customerEarningSchema
);

module.exports = CustomerEarning;
