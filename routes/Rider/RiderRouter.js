const express = require("express");
const router = express.Router();
const {
  createRider,
  sendOtp,
  verifyOtp,
  resendOtp,
  updateRiderLocation
} = require("../../controllers/Rider/RidersController");

// Rider Routes
router.post("/create", createRider);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/update-rider-location", updateRiderLocation);
module.exports = router;
