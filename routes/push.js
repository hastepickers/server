import express from "express";
import DeviceToken from "../models/DeviceToken.js";
import DriverDeviceToken from "../models/DriverDeviceToken.js";

const router = express.Router();

const updateDeviceInDB = async (req, res, Model, role) => {
  const { userId, deviceToken, platform } = req.body;

  if (!userId || !deviceToken || !platform) {
    return res.status(400).json({
      message: "userId, deviceToken, and platform are required.",
    });
  }

  try {
    const updatedDevice = await Model.findOneAndUpdate(
      { userId },
      { deviceToken, platform },
      { new: true, upsert: true, runValidators: true } 
    );

    console.log(`✅ Database Updated for ${role} [${userId}]:`, updatedDevice);

    return res.status(200).json({
      message: `${role} device updated successfully.`,
      data: updatedDevice,
    });
  } catch (error) {
    console.error(`❌ Error updating ${role} token:`, error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Route for standard Users
router.post("/register-device-token", (req, res) => {
  updateDeviceInDB(req, res, DeviceToken, "User");
});

// Route for Drivers
router.post("/driver-register-device-token", (req, res) => {
  updateDeviceInDB(req, res, DriverDeviceToken, "Driver");
});

export default router;
