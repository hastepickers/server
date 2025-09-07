const mongoose = require("mongoose");

const companyExpenseSchema = new mongoose.Schema(
  {
    month: { type: Number, required: true }, // 1 - 12
    year: { type: Number, required: true }, // e.g. 2025
    title: { type: String, required: true }, // e.g. "Office Rent", "Fuel"
    amount: { type: Number, required: true }, // amount spent
    category: { type: String }, // optional, e.g. "Utilities", "Transport"
    note: { type: String }, // optional extra description
    notes: { type: String }, // optional extra descr
  },
  { timestamps: true }
);

// Non-unique index for faster lookups
companyExpenseSchema.index({ year: 1, month: 1 });

const CompanyExpense = mongoose.model("CompanyExpense", companyExpenseSchema);

module.exports = CompanyExpense;