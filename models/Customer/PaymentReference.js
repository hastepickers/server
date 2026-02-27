const mongoose = require("mongoose");

const paymentReferenceSchema = new mongoose.Schema(
  {
    orderID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true, // To ensure references are unique
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const PaymentReference = mongoose.model(
  "PaymentReference",
  paymentReferenceSchema
);

module.exports = PaymentReference;
