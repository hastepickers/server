const express = require("express");
const router = express.Router();
const {
  getRiderProfile,
  updateRiderProfile,
  updatePhoneNumber,
  verifyOtpAndUpdatePhoneNumber,
  resendOtp,
  getRideSocketLogs,
} = require("../../controllers/Rider/UserRiderController");
const { verifyRiderTokenMiddleware } = require("../../utils/ridertokenUtil");

// Protected routes
router.get("/profile", verifyRiderTokenMiddleware, getRiderProfile);
router.put("/profile", verifyRiderTokenMiddleware, updateRiderProfile);
router.put("/update-phone", verifyRiderTokenMiddleware, updatePhoneNumber);
router.get("/ride-socket-logs", verifyRiderTokenMiddleware, getRideSocketLogs);
router.post(
  "/verify-otp",
  verifyRiderTokenMiddleware,
  verifyOtpAndUpdatePhoneNumber
);
router.put("/resend-otp", verifyRiderTokenMiddleware, resendOtp);

module.exports = router;
