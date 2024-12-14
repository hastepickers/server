const RequestARide = require("../../models/Customer/RequestARideSchema");
const Rider = require("../../models/Rider/RiderSchema");
const jwt = require("jsonwebtoken");
const RidersOtp = require("../../models/Rider/RidersOtp");
const mongoose = require("mongoose");

// Add a new rider
exports.addRider = async (req, res) => {
  try {
    const newRider = new Rider(req.body);
    await newRider.save();
    res.status(201).json({ message: "Rider added successfully", newRider });
  } catch (error) {
    res.status(500).json({ message: "Error adding rider", error });
  }
};
// Get All Ride Requests
exports.getAllRideRequests = async (req, res) => {
  try {
    // Fetch all ride requests from the database
    const rideRequests = await RequestARide.find()
      .populate({
        path: "rider.userId",
        model: "User", // Ensure this matches the User model
      })
      .exec();
    // .populate('customer.userId') // Optionally populate customer data
    // .populate('rider.userId'); // Optionally populate rider data
    console.log(rideRequests, "rideRequests");
    return res.status(200).json({ rideRequests });
  } catch (error) {
    console.error("Error fetching ride requests:", error);
    return res
      .status(500)
      .json({ message: "Error fetching ride requests", error });
  }
};

exports.getRideRequestById = async (req, res) => {
  const { id } = req.params; // Extract ID from request parameters

  try {
    // Validate the ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ride request ID" });
    }

    console.log("Fetching ride request with ID:", id);

    // Fetch the specific ride request
    const rideRequest = await RequestARide.findById(id)
      .populate({
        path: "rider.userId",
        model: "User",
      })
      .populate("customer.userId")
      .exec();

    // If no ride request is found
    if (!rideRequest) {
      return res.status(404).json({ message: "Ride request not found" });
    }

    return res.status(200).json({ rideRequest });
  } catch (error) {
    console.error("Error fetching ride request:", error);
    return res
      .status(500)
      .json({ message: "Error fetching ride request", error });
  }
};

// Function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Controller to assign or update a rider
exports.assignRider = async (req, res) => {
  try {
    const { rideId } = req.params; // Ride ID passed in the request params
    console.log(rideId, "rideId");
    // Validate the ObjectId
    if (!mongoose.isValidObjectId(rideId)) {
      return res.status(400).json({ message: "Invalid ride ID" });
    }

    // Find the ride request
    const ride = await RequestARide.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride request not found" });
    }

    // Extract pickup location from the ride request
    const pickupLatitude = ride.pickup.pickupLatitude;
    const pickupLongitude = ride.pickup.pickupLongitude;

    // Find available and active riders
    const activeRiders = await Rider.find({
      active: true,
      "riderLocation.ridersLatitude": { $exists: true },
      "riderLocation.ridersLongitude": { $exists: true },
    });

    if (!activeRiders || activeRiders.length === 0) {
      return res.status(404).json({ message: "No available riders found" });
    }

    // Calculate distance for each active rider and sort by proximity
    const ridersByProximity = activeRiders
      .map((rider) => {
        const distance = calculateDistance(
          pickupLatitude,
          pickupLongitude,
          rider.riderLocation.ridersLatitude,
          rider.riderLocation.ridersLongitude
        );
        return { ...rider._doc, distance };
      })
      .sort((a, b) => a.distance - b.distance); // Sort by distance

    const startTime = Date.now();
    let assignedRider = null;

    // Loop through riders until one accepts or time runs out
    for (let i = 0; i < ridersByProximity.length; i++) {
      const rider = ridersByProximity[i];

      // Simulate sending request to rider and waiting for response
      const accepted = await sendRideRequestToRider(rider._id, rideId); // This function should send a request to the rider

      if (accepted) {
        // If rider accepts, assign the rider
        assignedRider = rider;
        ride.rider = {
          userId: rider._id,
          firstName: rider.firstName,
          lastName: rider.lastName,
          plateNumber: rider.plateNumber,
          phoneNumber: rider.phoneNumber,
        };
        ride.acceptRide = true; // Mark ride as accepted
        await ride.save();
        return res
          .status(200)
          .json({ message: "Rider assigned successfully", assignedRider });
      }

      // Check if 2 minutes have passed
      if (Date.now() - startTime > 2 * 60 * 10000) {
        return res.status(408).json({
          message:
            "No available riders accepted the ride within the time limit",
        });
      }
    }

    // If no rider accepts after going through all riders
    return res
      .status(404)
      .json({ message: "No riders available at the moment" });
  } catch (error) {
    console.error("Error assigning rider:", error);
    res.status(500).json({ message: "Error assigning rider", error });
  }
};
// Simulated function to send request to rider and get their response
const sendRideRequestToRider = async (riderId, rideId) => {
  const simulatedResponse = Math.random() < 0.5; // Simulate a 50% chance of acceptance
  return simulatedResponse;
};

// Update rider location by rider ID
exports.updateRiderLocation = async (req, res) => {
  try {
    const { id } = req.params; // Rider ID
    const { ridersLatitude, ridersLongitude, ridersAddress } = req.body;

    // Find rider by ID and update the location fields
    const updatedRider = await Rider.findByIdAndUpdate(
      id,
      {
        "riderLocation.ridersLatitude": ridersLatitude,
        "riderLocation.ridersLongitude": ridersLongitude,
        "riderLocation.ridersAddress": ridersAddress,
      },
      { new: true } // Return the updated rider
    );

    if (!updatedRider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    res.status(200).json({
      message: "Rider location updated successfully",
      rider: updatedRider,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating rider location", error });
  }
};

// Get a single rider by ID
exports.getRider = async (req, res) => {
  try {
    const rider = await Rider.findById(req.params.id);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }
    res.status(200).json({ rider });
  } catch (error) {
    res.status(500).json({ message: "Error fetching rider", error });
  }
};

// Get all riders
exports.getAllRiders = async (req, res) => {
  try {
    const riders = await Rider.find();
    res.status(200).json({ riders });
  } catch (error) {
    res.status(500).json({ message: "Error fetching riders", error });
  }
};

// Edit a rider by ID
exports.editRider = async (req, res) => {
  try {
    const updatedRider = await Rider.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedRider) {
      return res.status(404).json({ message: "Rider not found" });
    }
    res
      .status(200)
      .json({ message: "Rider updated successfully", updatedRider });
  } catch (error) {
    res.status(500).json({ message: "Error updating rider", error });
  }
};

// Delete a rider by ID
exports.deleteRider = async (req, res) => {
  try {
    const deletedRider = await Rider.findByIdAndDelete(req.params.id);
    if (!deletedRider) {
      return res.status(404).json({ message: "Rider not found" });
    }
    res
      .status(200)
      .json({ message: "Rider deleted successfully", deletedRider });
  } catch (error) {
    res.status(500).json({ message: "Error deleting rider", error });
  }
};

// Add ride status to a rider
exports.addRideStatus = async (req, res) => {
  try {
    const { riderId, rideId } = req.body;

    const rider = await Rider.findById(riderId);
    const ride = await RequestARide.findById(rideId);

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // If the rider is already in a ride, return an error
    if (rider.inRide) {
      return res.status(400).json({ message: "Rider is already in a ride" });
    }

    // Add the ride status to the rider
    rider.inRide = ride._id;
    await rider.save();

    res.status(200).json({ message: "Ride status added to rider", rider });
  } catch (error) {
    res.status(500).json({ message: "Error adding ride status", error });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Check if rider exists
    const rider = await Rider.findOne({ phoneNumber });
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated OTP: ${otp}`);

    // Save OTP to RidersOtp schema
    const existingOtp = await RidersOtp.findOne({ phoneNumber });
    if (existingOtp) {
      existingOtp.otp = otp;
      existingOtp.createdAt = Date.now(); // Reset expiration
      await existingOtp.save();
    } else {
      const newOtp = new RidersOtp({ phoneNumber, otp });
      await newOtp.save();
    }

    console.log(`OTP sent to ${phoneNumber}: ${otp}`);

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP", error });
  }
};

// Verify the OTP and generate a token
exports.verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    // Find the OTP record
    const otpRecord = await RidersOtp.findOne({ phoneNumber });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP verified, generate JWT
    const token = jwt.sign({ phoneNumber }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Remove OTP record
    await RidersOtp.deleteOne({ phoneNumber });

    res.json({
      message: "OTP verified successfully",
      token: token,
    });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP", error });
  }
};
// Resend OTP to rider
exports.resendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Check if rider exists
    const rider = await Rider.findOne({ phoneNumber });
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Resent OTP: ${newOtp}`);

    // Update OTP in RidersOtp schema
    const otpRecord = await RidersOtp.findOne({ phoneNumber });
    if (otpRecord) {
      otpRecord.otp = newOtp;
      otpRecord.createdAt = Date.now();
      await otpRecord.save();
    } else {
      return res.status(400).json({ message: "OTP record not found" });
    }

    console.log(`OTP resent to ${phoneNumber}: ${newOtp}`);

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error resending OTP", error });
  }
};
