const express = require("express");
const router = express.Router();
const {
  createRider,
  sendOtp,
  verifyOtp,
  resendOtp,
} = require("../../controllers/Rider/RidersController");

// Rider Routes
router.post("/create", createRider);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

module.exports = router;
