const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/Admin/adminController");
const { protectAdmin } = require("../../Middlewares/adminMiddleware");

router.post("/send", protectAdmin, adminController.adminPushController);

router.post("/register", adminController.createAdmin);
router.post("/login", adminController.loginRequest);
router.post("/verify-otp", adminController.verifyOtp);
router.get("/history", protectAdmin, adminController.getNotificationHistory);
// Protected: Only existing admins can see the list of other admins
router.get("/all", protectAdmin, adminController.getAllAdmins);

module.exports = router;
