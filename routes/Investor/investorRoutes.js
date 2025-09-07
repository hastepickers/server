// routes/investors/investorRoutes.js
const express = require("express");
const {
  createAccount,
  login,
  verifyOtp,
  resendOtp,
  getProfile
} = require("../../controllers/investors/investorController");

const router = express.Router();

router.post("/create-account", createAccount);
router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.get('/profile/:phone', getProfile);


module.exports = router;