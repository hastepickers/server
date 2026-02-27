const express = require("express");
const router = express.Router();
const dashboardController = require("../../controllers/Admin/adminDashboardController");
const { protectAdmin } = require("../../Middlewares/adminMiddleware");

router.use(protectAdmin);

router.get("/stats", dashboardController.getDashboardStats);
router.get("/users", dashboardController.getAllUsers);
router.get("/riders", dashboardController.getAllRiders);
router.get("/rides", dashboardController.getAllRides);
router.get("/payments", dashboardController.getAllPayments);

module.exports = router;
