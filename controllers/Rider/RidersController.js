// const Rider = require("../models/Rider");
// const RiderOtp = require("../models/RiderOtp");
const crypto = require("crypto");
const { generateRiderToken } = require("../../utils/ridertokenUtil");
// const RiderOtp = require("../../models/Rider/RidersOtp");
const Rider = require("../../models/Rider/RiderSchema");
const RiderOtp = require("../../models/Rider/RidersOtp");
const RidersOtp = require("../../models/Rider/RidersOtp");
const { sendWhatsApp } = require("../../utils/sendWhatsApp");

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
  console.log("--------------------------------------------------");
  console.log("📲 [sendOtp] Normalizing Phone Number for Pilot Login...");

  try {
    let { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // 1. Create normalized versions
    let rawNumber = phoneNumber.toString().trim();
    let zeroNumber = rawNumber.startsWith("0") ? rawNumber : `0${rawNumber}`;
    let noZeroNumber = rawNumber.startsWith("0") ? rawNumber.substring(1) : rawNumber;

    console.log(`🔍 [sendOtp] Searching for: [${zeroNumber}] or [${noZeroNumber}]`);

    // 2. Search Rider
    let rider = await Rider.findOne({
      phoneNumber: { $in: [zeroNumber, noZeroNumber] },
    });

    if (!rider) {
      console.error(`❌ [sendOtp] Rider not found: ${phoneNumber}`);
      return res.status(404).json({ message: "Rider not found" });
    }

    // 3. AUTO-UPDATE: Sync format to leading zero
    if (rider.phoneNumber === noZeroNumber) {
      rider.phoneNumber = zeroNumber;
      await rider.save();
      console.log("✅ [sendOtp] Rider profile updated with leading zero.");
    }

    // 4. Generate & Save OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    await RiderOtp.findOneAndUpdate(
      { phoneNumber: zeroNumber },
      { phoneNumber: zeroNumber, otp },
      { upsert: true, new: true }
    );

    console.log(`🎫 [sendOtp] OTP generated for ${zeroNumber}: ${otp}`);

    // 5. 🛡️ FAIL-SAFE WHATSAPP (Non-blocking)
    (async () => {
      try {
        console.log(`📡 [Background-WA] Sending OTP to Pilot: ${zeroNumber}`);
        await sendWhatsApp(zeroNumber, `Your Pickars Pilot login code is: ${otp}. Valid for 30 mins.`);
        console.log(`✅ [Background-WA] Delivered to Pilot.`);
      } catch (waErr) {
        console.error(`⚠️ [Background-WA] WhatsApp failed: ${waErr.message}`);
      }
    })();

    console.log("--------------------------------------------------");
    res.status(200).json({ message: "OTP sent successfully for login", success: true });

  } catch (error) {
    console.error("🔥 Error in sendOtp:", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.resendOtp = async (req, res) => {
  console.log("--------------------------------------------------");
  console.log("🔄 [resendOtp] Normalizing and Resending to Pilot...");

  try {
    let { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    let rawNumber = phoneNumber.toString().trim();
    let zeroNumber = rawNumber.startsWith("0") ? rawNumber : `0${rawNumber}`;
    let noZeroNumber = rawNumber.startsWith("0") ? rawNumber.substring(1) : rawNumber;

    let rider = await Rider.findOne({
      phoneNumber: { $in: [zeroNumber, noZeroNumber] },
    });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    if (rider.phoneNumber === noZeroNumber) {
      rider.phoneNumber = zeroNumber;
      await rider.save();
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpRecord = await RiderOtp.findOneAndUpdate(
      { phoneNumber: zeroNumber },
      { phoneNumber: zeroNumber, otp },
      { upsert: true, new: true }
    );

    console.log(`🎫 [resendOtp] OTP resent for ${zeroNumber}: ${otp}`);

    // 5. 🛡️ FAIL-SAFE WHATSAPP (Non-blocking)
    (async () => {
      try {
        console.log(`📡 [Background-WA] Resending OTP to Pilot: ${zeroNumber}`);
        await sendWhatsApp(zeroNumber, `Your new Pickars Pilot login code is: ${otp}`);
        console.log(`✅ [Background-WA] Delivered.`);
      } catch (waErr) {
        console.error(`⚠️ [Background-WA] WhatsApp failed: ${waErr.message}`);
      }
    })();

    console.log("--------------------------------------------------");
    res.status(200).json({
      message: "OTP resent successfully",
      phoneNumber: otpRecord.phoneNumber,
      success: true,
    });
  } catch (error) {
    console.error("🔥 Error in resendOtp:", error.message);
    res.status(500).json({ message: "Failed to resend OTP", error: error.message, success: false });
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
    res.status(500).json({
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
