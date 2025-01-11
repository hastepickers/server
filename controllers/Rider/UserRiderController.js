// Assuming you have an OTP model
const crypto = require("crypto"); // Assuming the JWT utility file
const Rider = require("../../models/Rider/RiderSchema");
const RidersOtp = require("../../models/Rider/RidersOtp");
const { fail } = require("assert");
//const RidersOtp = require("../../models/Rider/RidersOtp");
const RideSocket = require("../../models/Rider/RideSocket");
// Get Rider's Profile
exports.getRiderProfile = async (req, res) => {
  try {
    const riderId = req.riderId; // Assuming `riderId` is stored in the token (from the middleware)
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    res.status(200).json({ rider, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.getRideSocketLogs = async (req, res) => {
  try {
    const driverId = req.riderId;

    // Log incoming driverId and the request
    console.log("Received Request to Get Ride Socket Logs");
    console.log("Driver ID:", driverId);

    // Validate input
    if (!driverId) {
      console.log("Error: Driver ID is missing");
      return res.status(400).json({ message: "Driver ID is required" });
    }

    // Query the database for rides matching the criteria
    console.log(
      "Querying the database for rideSockets with driverId:",
      driverId
    );
    const rideSockets = await RideSocket.find(
      { driverId, status: "pairing" }, // Filters
      { rideId: 1, pickup: 1, _id: 0 } // Fields to return
    );

    // Log the result of the database query
    console.log("Database Query Result:", rideSockets);

    if (rideSockets.length === 0) {
      console.log("No matching ride sockets found for driverId:", driverId);
      return res
        .status(400)
        .json({ message: "No matching ride sockets found" });
    }

    // Respond with the filtered data
    console.log("Sending Response with rideSocket data");
    res.status(200).json({ rideSockets: rideSockets, success: true });
  } catch (error) {
    // Log the error
    console.error("Error occurred:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Rider's Profile
exports.updateRiderProfile = async (req, res) => {
  try {
    const riderId = req.riderId;

    // Destructure all updatable fields from req.body
    const {
      firstName,
      lastName,
      phoneNumber,
      countryCode,
      plateNumber,
      NIN,
      imageUrl,
      active,
      verified,
      pushNotifications,
      newsletterSubscription,
      promotionNotifications,
      vehicleType,
      vehicleName,
      vehicleColor,
      email,
    } = req.body;

    console.log(
      firstName,
      lastName,
      phoneNumber,
      countryCode,
      plateNumber,
      NIN,
      imageUrl,
      active,
      verified,
      pushNotifications,
      newsletterSubscription,
      promotionNotifications,
      vehicleType,
      vehicleName,
      vehicleColor,
      email,
      req.body
    );
    // Update the rider's profile with the provided fields
    const rider = await Rider.findByIdAndUpdate(
      riderId,
      {
        firstName,
        lastName,
        phoneNumber,
        countryCode,
        plateNumber,
        NIN,
        imageUrl,
        active,
        verified,
        pushNotifications,
        newsletterSubscription,
        promotionNotifications,
        vehicleType,
        vehicleName,
        vehicleColor,
        email,
      },
      { new: true } // Return the updated document
    );

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      rider,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Update Phone Number
exports.updatePhoneNumber = async (req, res) => {
  try {
    const { newPhoneNumber, oldPhoneNumber } = req.body;

    // Check if the new phone number is already taken by another rider
    const existingRider = await Rider.findOne({ phoneNumber: newPhoneNumber });
    if (existingRider) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number already in use" });
    }

    // Generate OTPs for both the old and new phone numbers
    const otpOld = crypto.randomInt(100000, 999999).toString();
    const otpNew = crypto.randomInt(100000, 999999).toString();

    // Store or update OTPs in the RidersOtp collection
    await RidersOtp.findOneAndUpdate(
      { phoneNumber: oldPhoneNumber },
      { phoneNumber: oldPhoneNumber, otp: otpOld },
      { upsert: true, new: true } // Create a new document if one doesn't exist
    );

    await RidersOtp.findOneAndUpdate(
      { phoneNumber: newPhoneNumber },
      { phoneNumber: newPhoneNumber, otp: otpNew },
      { upsert: true, new: true } // Create a new document if one doesn't exist
    );

    console.log(`Old OTP: ${otpOld}, New OTP: ${otpNew}`);
    res.status(200).json({
      message: "OTP sent to both old and new phone numbers",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message, success: false });
  }
};

// Verify OTPs and Update Phone Number
exports.verifyOtpAndUpdatePhoneNumber = async (req, res) => {
  try {
    const { oldOtp, newOtp, newPhoneNumber, oldPhoneNumber } = req.body;

    console.log(oldOtp, newOtp, newPhoneNumber, oldPhoneNumber);
    // Verify OTPs for both old and new phone numbers
    const oldOtpRecord = await RidersOtp.findOne({
      phoneNumber: oldPhoneNumber,
    });
    const newOtpRecord = await RidersOtp.findOne({
      phoneNumber: newPhoneNumber,
    });
    console.log(oldOtpRecord, newOtpRecord);

    if (!oldOtpRecord || oldOtpRecord.otp !== oldOtp) {
      return res
        .status(400)
        .json({ message: "Invalid OTP for old phone number" });
    }

    if (!newOtpRecord || newOtpRecord.otp !== newOtp) {
      return res
        .status(400)
        .json({ message: "Invalid OTP for new phone number" });
    }

    // Update the rider's phone number
    const rider = await Rider.findByIdAndUpdate(
      req.riderId,
      { phoneNumber: newPhoneNumber },
      { new: true }
    );

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    res
      .status(200)
      .json({ message: "Phone number updated successfully", rider });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Resend OTP to a phone number
exports.resendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    console.log(`OTP for ${phoneNumber}:`);
    // Validate phone number input
    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    // Generate a new OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Check if the phone number already exists in RidersOtp
    const otpRecord = await RidersOtp.findOneAndUpdate(
      { phoneNumber },
      { phoneNumber, otp },
      { upsert: true, new: true } // Update existing or create a new document
    );

    // Log OTP (for testing purposes; in production, send the OTP via SMS)
    console.log(`OTP for ${phoneNumber}: ${otp}`);

    res.status(200).json({
      message: "OTP resent successfully",
      phoneNumber: otpRecord.phoneNumber,
      otp: otpRecord.otp, // Include for testing; remove in production
      success: true,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to resend OTP", error: error.message });
  }
};

// // Middleware to verify the rider token
// exports.verifyRiderToken = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header

//   if (!token) {
//     return res.status(403).json({ message: "No token provided" });
//   }

//   try {
//     const decoded = verifyRiderToken(token); // This function decodes and verifies the token
//     req.riderId = decoded.riderId; // Attach riderId to the request object
//     req.riderPhoneNumber = decoded.phoneNumber; // Assuming you store phoneNumber in the token
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }
// };
