const express = require("express");
const router = express.Router();
const {
  addVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require("../../controllers/Admin/TypeOfVehicle");

// Add a new vehicle
router.post("/", addVehicle);

// Get all vehicles
router.get("/", getAllVehicles);

// Get a specific vehicle by ID
router.get("/:id", getVehicleById);

// Update a vehicle
router.put("/:id", updateVehicle);

// Delete a vehicle
router.delete("/:id", deleteVehicle);

module.exports = router;
