const express = require("express");
const {
  getUserProfile,
  updateUserProfile,
  updatePhoneNumberRequest,
  verifyPhoneNumberChange,
  updateNotificationPreferences,
  requestOtpForPhoneNumber,
  verifyUser,
  getUserByPhoneNumber,
  //healthCheck
} = require("../../controllers/Customer/userController");

const router = express.Router();

// Get user profile data excluding password
router.get("/profile", getUserProfile);
router.get("/find-user-by-phone", getUserByPhoneNumber);
//router.get("/healthCheck", healthCheck);
//// Update user's first name, last name, and country code
router.put("/profile-update", updateUserProfile);

// Request OTP for updating phone number
router.post("/phone-update-request", updatePhoneNumberRequest);
router.post("/send-otp", requestOtpForPhoneNumber);
router.post("/verify-otp", verifyUser);

// Verify phone number change
router.post("/phone-update-verify", verifyPhoneNumberChange);
router.put("/preferences", updateNotificationPreferences);

module.exports = router;
