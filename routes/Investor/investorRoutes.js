const express = require("express");
const {
  createAccount,
  login,
  verifyOtp,
  resendOtp,
  getProfile,
  getRideStats,
  getPaidAndEndedRides,
  getCompanyExpenses,
  addCompanyExpense,
  updateCompanyExpense,
  deleteCompanyExpense,
  addOtherEarning,
  getFinancialSummary,
} = require("../../controllers/investors/investorController");

const router = express.Router();

// User authentication and profile
router.post("/create-account", createAccount);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.get("/profile/:phone", getProfile);

// Ride and statistics
router.get("/ride-stats", getRideStats);
router.get("/get-paid-end-ended-rides-stats", getPaidAndEndedRides);

// Financial management
router.get("/expenses", getCompanyExpenses);
router.post("/expenses", addCompanyExpense);
router.put("/expenses", updateCompanyExpense);
router.delete("/expenses", deleteCompanyExpense);
router.post("/earnings", addOtherEarning);
router.post("/financial/financial-summary", getFinancialSummary);

module.exports = router;
