const express = require("express");
const router = express.Router();
const {
  getRiderProfile,
  updateRiderProfile,
  updatePhoneNumber,
  verifyOtpAndUpdatePhoneNumber,
  resendOtp,
  getRideSocketLogs,
  getRideById,
  getRidesByDriver,
  getRidesByStatus,
  updateRiderLocation,
  toggleRiderActiveStatus,
} = require("../../controllers/Rider/UserRiderController");
const { verifyRiderTokenMiddleware } = require("../../utils/ridertokenUtil");

// Protected routes
router.get("/profile", verifyRiderTokenMiddleware, getRiderProfile);
router.get("/get-a-ride/:id", verifyRiderTokenMiddleware, getRideById);
router.put("/profile", verifyRiderTokenMiddleware, updateRiderProfile);
router.put("/update-phone", verifyRiderTokenMiddleware, updatePhoneNumber);
router.get("/ride-socket-logs", verifyRiderTokenMiddleware, getRideSocketLogs);
router.post(
  "/verify-otp",
  verifyRiderTokenMiddleware,
  verifyOtpAndUpdatePhoneNumber
);
router.put("/resend-otp", verifyRiderTokenMiddleware, resendOtp);
router.get("/all-driver-rides", verifyRiderTokenMiddleware, getRidesByDriver);
router.get(
  "/all-driver-rides-by-status/:status",
  verifyRiderTokenMiddleware,
  getRidesByStatus
);
router.put("/update-rider-location", updateRiderLocation);
router.put(
  "/toggle-rider-active-status",
  verifyRiderTokenMiddleware,
  toggleRiderActiveStatus
);

//toggleRiderActiveStatus
module.exports = router;
