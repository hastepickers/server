const express = require("express");
const router = express.Router();
const {
  loginCompany,
  resetCompanyPassword,
  createCompany,
  updateCompany,
  forgotPassword,
  verifyOtp,
  resendOtp,
  resetPassword,
} = require("../../controllers/Rider/CompanyController");

// Company Routes
router.post("/login", loginCompany);
router.post("/reset-password", resetCompanyPassword);
router.post("/create", createCompany);
router.put("/update/:id", updateCompany);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/reset-password/:id", resetPassword);

module.exports = router;
