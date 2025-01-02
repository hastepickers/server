const express = require("express");
const router = express.Router();
const rideController = require("../../controllers/Customer/RequestARideController"); // Import ride controller
//const { acceptRide } = require("../../controllers/Customer/userController");

// Create a new ride
router.post("/create", rideController.createRide);

// Get ride details by ID

// Update ride status (start, cancel, end, etc.)
router.patch("/:id/update-status", rideController.updateRideStatus);

// Get all rides by customerId
router.get("/customer/rides", rideController.getRidesByCustomerId);
router.get("/customer/ongoing", rideController.getRidesOngoingForCustomer);
router.post("/rating/customer/rating-rider/:riderId", rideController.rateRider);
router.put("/cancel-ride/quick-cancel/:rideId", rideController.cancelRideById);

router.get("/:id", rideController.getRideById);
// Get all rides by riderId
router.get("/rider/:riderId", rideController.getRidesByRiderId);
router.post("/book-a-ride/customer/booking", rideController.bookARide);
router.post("/accept-ride/:rideId", rideController.acceptRide);

module.exports = router;

//accessToken
