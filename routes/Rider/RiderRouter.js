const express = require("express");
const router = express.Router();
const riderController = require("../../controllers/Rider/RiderController");

// Routes for rider operations
router.post("/", riderController.addRider); // Add a new rider
router.get("/:id", riderController.getRider); // Get a single rider by ID
router.get("/", riderController.getAllRiders); // Get all
router.put("/:id", riderController.editRider); // Edit a rider by ID
router.delete("/:id", riderController.deleteRider); // Delete a rider by ID
router.post("/login", riderController.sendOtp);
router.post("/verify-otp", riderController.verifyOtp);
router.post("/resend-otp", riderController.resendOtp);
router.put("/location/:id", riderController.updateRiderLocation);
router.put("/assign/:rideId", riderController.assignRider);
router.get("/requests/rides", riderController.getAllRideRequests);
router.get("/requests/rides/:id", riderController.getRideRequestById);

module.exports = router;
