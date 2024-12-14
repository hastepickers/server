const TypeOfVehicle = require("../../models/Admin/TypeOfVehicleSchema");

// Create a new type of vehicle
exports.addVehicle = async (req, res) => {
  try {
    const { name, logoUrl, type, company, active, plateNumber, ridersId } =
      req.body;

    const newVehicle = new TypeOfVehicle({
      name,
      logoUrl,
      type,
      company,
      active,
      ridersId,
      plateNumber,
    });

    await newVehicle.save();
    res.status(201).json({ message: "Vehicle added successfully", newVehicle });
  } catch (error) {
    res.status(500).json({ message: "Error adding vehicle", error });
  }
};

// Get all vehicles
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await TypeOfVehicle.find();
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ message: "Error fetching vehicles", error });
  }
};

// Get a specific vehicle by ID
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await TypeOfVehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.status(200).json(vehicle);
  } catch (error) {
    res.status(500).json({ message: "Error fetching vehicle", error });
  }
};

// Update a vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const updatedVehicle = await TypeOfVehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedVehicle)
      return res.status(404).json({ message: "Vehicle not found" });
    res.status(200).json(updatedVehicle);
  } catch (error) {
    res.status(500).json({ message: "Error updating vehicle", error });
  }
};

// Delete a vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const deletedVehicle = await TypeOfVehicle.findByIdAndDelete(req.params.id);
    if (!deletedVehicle)
      return res.status(404).json({ message: "Vehicle not found" });
    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting vehicle", error });
  }
};
