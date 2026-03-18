// const Rider = require("../models/Rider");
// const RiderOtp = require("../models/RiderOtp");
const crypto = require("crypto");
const { generateRiderToken } = require("../../utils/ridertokenUtil");
// const RiderOtp = require("../../models/Rider/RidersOtp");
const Rider = require("../../models/Rider/RiderSchema");
const RiderOtp = require("../../models/Rider/RidersOtp");
const RidersOtp = require("../../models/Rider/RidersOtp");

// Create a new rider and send OTP to the phone number
exports.createRider = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      countryCode,
      plateNumber,
      NIN,
      NINverified,
      imageUrl,
    } = req.body;

    // Check if the rider already exists
    const existingRider = await Rider.findOne({ phoneNumber });
    if (existingRider) {
      return res.status(400).json({ message: "Rider already exists" });
    }

    // Create new rider
    const newRider = new Rider({
      firstName,
      lastName,
      phoneNumber,
      countryCode,
      plateNumber,
      NIN,
      NINverified,
      imageUrl,
    });

    // Save rider to the database
    await newRider.save();

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Save OTP in RiderOtp schema
    await RiderOtp.findOneAndUpdate(
      { phoneNumber },
      { phoneNumber, otp },
      { upsert: true, new: true }
    );

    // Send OTP (mocking OTP send to phone number for now)
    console.log(`OTP for ${phoneNumber}: ${otp}`);

    res.status(200).json({ message: "Rider created and OTP sent" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send OTP
exports.sendOtp = async (req, res) => {
  try {
    let { phoneNumber } = req.body;

    // --- Normalization Logic ---
    if (phoneNumber) {
      phoneNumber = phoneNumber.toString().trim();
      // If it starts with 90, 80, 70, etc. (missing the leading zero), add it
      if (!phoneNumber.startsWith("0")) {
        phoneNumber = `0${phoneNumber}`;
      }
    }
    // ---------------------------

    console.log(phoneNumber, "Normalized phoneNumber");

    // Check if rider exists with the normalized number
    const rider = await Rider.findOne({ phoneNumber });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Save or update the OTP
    await RiderOtp.findOneAndUpdate(
      { phoneNumber },
      { phoneNumber, otp },
      { upsert: true, new: true }
    );

    console.log(`OTP for ${phoneNumber}: ${otp}`);

    res.status(200).json({
      message: "OTP sent successfully for login",
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    let { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    // --- Normalization Logic ---
    phoneNumber = phoneNumber.toString().trim();
    if (!phoneNumber.startsWith("0")) {
      phoneNumber = `0${phoneNumber}`;
    }
    // ---------------------------

    const otp = crypto.randomInt(100000, 999999).toString();

    // Use normalized phoneNumber to find/update the record
    const otpRecord = await RidersOtp.findOneAndUpdate(
      { phoneNumber },
      { phoneNumber, otp },
      { upsert: true, new: true }
    );

    console.log(`OTP resent for ${phoneNumber}: ${otp}`);

    res.status(200).json({
      message: "OTP resent successfully",
      phoneNumber: otpRecord.phoneNumber,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to resend OTP", error: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    let { phoneNumber, otp } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    // --- Normalization Logic ---
    phoneNumber = phoneNumber.toString().trim();
    if (!phoneNumber.startsWith("0")) {
      phoneNumber = `0${phoneNumber}`;
    }
    // ---------------------------

    console.log(phoneNumber, "Verifying Normalized Number");

    // Updated Test Match to include the zero for consistency
    if (phoneNumber === "08120710198" && otp === "123456") {
      let rider = await Rider.findOne({ phoneNumber });
      if (!rider) {
        rider = new Rider({ phoneNumber });
        await rider.save();
      }

      const { accessToken, refreshToken } = generateRiderToken(rider._id);

      return res.status(200).json({
        message: "OTP verified successfully (Test Match)",
        accessToken,
        refreshToken,
        user: rider,
        success: true,
      });
    }

    // Check RiderOtp with normalized number
    const riderOtp = await RiderOtp.findOne({ phoneNumber });
    if (!riderOtp || riderOtp.otp !== otp) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP", success: false });
    }

    // Find or Create Rider with normalized number
    let rider = await Rider.findOne({ phoneNumber });
    if (!rider) {
      rider = new Rider({ phoneNumber });
      await rider.save();
    }

    const { accessToken, refreshToken } = generateRiderToken(rider._id);

    res.status(200).json({
      message: "OTP verified successfully",
      accessToken,
      refreshToken,
      user: rider,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, success: false });
  }
};

exports.updateRiderLocation = async (req, res) => {
  try {
    // const { id } = req.params;
    const { latitude, longitude, address, id } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required." });
    }

    const updatedRider = await Rider.findByIdAndUpdate(
      id,
      {
        $set: {
          "riderLocation.ridersLatitude": latitude,
          "riderLocation.ridersLongitude": longitude,
          "riderLocation.ridersAddress": address,
        },
      },
      { new: true }
    );

    if (!updatedRider) {
      return res.status(404).json({ message: "Rider not found." });
    }

    res.status(200).json({
      message: "Rider location updated successfully.",
      rider: updatedRider,
      success: true,
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to update rider location.",
        error: error.message,
      });
  }
};

// Verify OTP
// Verify OTP and Login
exports.verifyOtps = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    console.log(phoneNumber, otp, "phoneNumber new");
    const riderOtp = await RiderOtp.findOne({ phoneNumber });
    if (!riderOtp || riderOtp.otp !== otp) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP", success: false });
    }

    // Check if rider exists, if not, create a new rider
    let rider = await Rider.findOne({ phoneNumber });
    if (!rider) {
      rider = new Rider({ phoneNumber });
      await rider.save();
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateRiderToken(rider._id);

    res.status(200).json({
      message: "OTP verified successfully",
      accessToken,
      refreshToken,
      user: rider,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, success: false });
  }
};

// Resend OTP
// Resend OTP

// exports.resendOtp = async (req, res) => {
//   try {
//     const { phoneNumber } = req.body;

//     // Check if a rider exists with the given phone number
//     const rider = await Rider.findOne({ phoneNumber });

//     if (!rider) {
//       // If no rider is found with this phone number, return an error
//       return res
//         .status(404)
//         .json({ message: "No rider found with this phone number" });
//     }

//     // Generate new OTP
//     const otp = crypto.randomInt(100000, 999999).toString();

//     // Update OTP in RiderOtp
//     await RiderOtp.findOneAndUpdate(
//       { phoneNumber },
//       { phoneNumber, otp },
//       { upsert: true, new: true }
//     );

//     console.log(`New OTP for ${phoneNumber}: ${otp}`);

//     // Return success message
//     res.status(200).json({ message: "OTP resent to phone number" });
//   } catch (error) {
//     console.error(error); // Log error for debugging purposes
//     res.status(500).json({ error: error.message });
//   }
// };
