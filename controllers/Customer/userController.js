const User = require("../../models/Customer/User");
const Otp = require("../../models/Customer/Otp");
const otpGenerator = require("otp-generator");
const mongoose = require("mongoose");
const RequestARide = require("../../models/Customer/RequestARideSchema");
// Get user profile data excluding password
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const generateOtp = (length) => {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10); // Generate a random digit between 0 and 9
  }
  return otp;
};
exports.getUserReceivingRidesDetails = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const receivingItems = user.receivingItems || [];

    const ridesWithFilteredDropoffs = await Promise.all(
      receivingItems.map(async (item) => {
        try {
          const ride = await RequestARide.findById(item.rideId).lean();
          if (!ride) return null;

          const matchedDropoffs = (ride.deliveryDropoff || []).filter(
            (drop) =>
              drop.receiverUserId &&
              drop.receiverUserId.toString() === userId.toString()
          );

          if (matchedDropoffs.length === 0) return null;

          // For each matching dropoff, construct minimal ride data
          return matchedDropoffs.map((drop) => ({
            rideId: ride._id,
            deliveryLocation: {
              address: drop.deliveryAddress,
              latitude: drop.deliveryLatitude,
              longitude: drop.deliveryLongitude,
            },
            pickup: {
              senderName: `${ride?.customer?.firstName || ""} ${
                ride?.customer?.lastName || ""
              }`.trim(),
              senderPhoneNumber: ride?.customer?.phoneNumber || "",
              pickupAddress: ride?.pickup?.pickupAddress || "",
            },
            rideStatus: {
              isEnded: ride?.endRide?.isEnded || false,
            },
            createdAt: ride?.createdAt,
            receivedAt: new Date(), // You can change this logic if needed
          }));
        } catch (error) {
          console.error(`❌ Error fetching ride ${item.rideId}:`, error);
          return null;
        }
      })
    );

    // Flatten array and remove nulls
    const validRides = ridesWithFilteredDropoffs
      .flat()
      .filter((r) => r !== null);

    return res.status(200).json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        imageUrl: user.imageUrl,
      },
      receivingRides: validRides,
    });
  } catch (err) {
    console.error("❌ Error in getUserReceivingRidesDetails:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

exports.checkPhoneNumberAgainstUser = async (req, res) => {
  let { phoneNumber } = req.body;
  const userId = req.user.id;

  console.log("📥 Incoming phone number:", phoneNumber);
  console.log("👤 Requesting user ID:", userId);

  if (!phoneNumber) {
    console.log("❌ No phone number provided");
    return res.status(400).json({ message: "Phone number is required" });
  }

  phoneNumber = phoneNumber.trim();
  console.log("✂️ Trimmed phone number:", phoneNumber);

  if (phoneNumber.startsWith("+234")) {
    phoneNumber = phoneNumber.slice(4);
    console.log("🔁 Removed +234 prefix:", phoneNumber);
  } else if (phoneNumber.startsWith("234")) {
    phoneNumber = phoneNumber.slice(3);
    console.log("🔁 Removed 234 prefix:", phoneNumber);
  } else if (phoneNumber.startsWith("0")) {
    phoneNumber = phoneNumber.slice(1);
    console.log("🔁 Removed 0 prefix:", phoneNumber);
  }

  try {
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      console.log("❌ Current user not found");
      return res.status(404).json({ message: "User not found" });
    }

    const currentUserNormalizedPhone = currentUser.phoneNumber
      .trim()
      .replace(/^\+234/, "")
      .replace(/^234/, "")
      .replace(/^0/, "");

    console.log(
      "📲 Normalized current user phone:",
      currentUserNormalizedPhone
    );

    if (currentUserNormalizedPhone === phoneNumber) {
      console.log("⚠️ Phone number matches current user");

      return res.status(200).json({
        message:
          "Provided phone number is the same as the current user's phone number",
        isSame: true,
        currentUser: true,
        user: {
          firstName: capitalize(currentUser.firstName),
          lastName: capitalize(currentUser.lastName),
          phoneNumber: currentUser.phoneNumber,
          _id: currentUser._id,
        },
      });
    }

    const matchedUser = await User.findOne({
      phoneNumber: { $regex: new RegExp(`${phoneNumber}$`) },
    });

    if (!matchedUser) {
      console.log("🔍 No matching user found for phone:", phoneNumber);
      return res.status(404).json({
        message: "No user found with the provided phone number",
        exists: false,
      });
    }

    console.log("✅ Found matching user:", {
      firstName: matchedUser.firstName,
      lastName: matchedUser.lastName,
      phoneNumber: matchedUser.phoneNumber,
    });

    return res.status(200).json({
      message: "User found with this phone number",
      exists: true,
      user: {
        firstName: capitalize(currentUser.firstName),
        lastName: capitalize(currentUser.lastName),
        phoneNumber: currentUser.phoneNumber,
        _id: currentUser._id,
      },
    });
  } catch (error) {
    console.log("💥 Internal error occurred:", error);
    return res.status(500).json({
      message: "Internal server error while checking phone number",
      error,
    });
  }
};

exports.getUserProfile = async (req, res) => {
  const userId = req.user.id; // Get user ID from JWT
  console.log(userId, "userIduserId");
  try {
    // Fetch the user object excluding the password
    const userAccount = await User.findById(userId).select("-password");
    if (!userAccount)
      return res.status(404).json({ message: "User not found" });

    // Fetch completed rides for the user
    const completedRidesCount = await RequestARide.countDocuments({
      "customer.customerId": userId,
      "endRide.isEnded": true,
    });

    // Add the completedRidesCount to the user object
    const user = {
      ...userAccount.toObject(),
      completedRidesCount,
    };

    // Return the user profile with the completed rides count
    console.log(user, "user");
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error); // Log error
    res.status(500).json({ message: "Error fetching user profile", error });
  }
};
// Request OTP to a phone number
exports.requestOtpForPhoneNumber = async (req, res) => {
  const { phoneNumber } = req.body; // Extract phone number from request body
  const userId = req.user.id; // Get user ID from JWT

  try {
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the phone number already has an OTP record
    let otpRecord = await Otp.findOne({ phoneNumber });

    if (otpRecord) {
      // If OTP record exists, generate a new OTP and update the existing record
      const otp = generateOtp(6);
      otpRecord.otp = otp; // Update the OTP value
      await otpRecord.save();
      console.log("OTP updated for phone number:", phoneNumber);
    } else {
      // If no OTP record exists, create a new OTP record
      const otp = generateOtp(6);
      otpRecord = new Otp({ userId, phoneNumber, otp });
      await otpRecord.save();
      console.log("OTP created for phone number:", phoneNumber);
    }

    // Send OTP to the phone number (you would integrate with an SMS service here)
    // Example: await sendSms(phoneNumber, otp);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error); // Log error
    res.status(500).json({ message: "Error sending OTP", error });
  }
};

exports.verifyUser = async (req, res) => {
  const { phoneNumber, otp } = req.body; // Extract phone number and OTP from the request body

  try {
    // Check if OTP record exists for the phone number and matches the provided OTP
    const otpRecord = await Otp.findOne({ phoneNumber });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    // Delete the OTP record after successful verification
    await Otp.deleteOne({ phoneNumber });
    console.log(user, "user");

    // Respond with success message, success flag, and tokens
    res.status(200).json({
      message: "OTP verified successfully",
      verified: true,
    });
  } catch (error) {
    console.error("Error verifying account:", error);
    res
      .status(500)
      .json({ message: "Error verifying account", error, success: false });
  }
};

// Update user's first name, last name, and country code
exports.updateUserProfile = async (req, res) => {
  const { firstName, lastName, countryCode, email } = req.body;
  console.log(firstName, lastName, "firstName, lastName");
  const userId = req.user.id; // Consistent user ID access

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, countryCode, email },
      { new: true, select: "-password" } // Exclude password
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error); // Log error
    res.status(500).json({ message: "Error updating user profile", error });
  }
};

// Request OTP for updating phone number
// Request OTP for updating phone number
// Request OTP for updating phone number
exports.updatePhoneNumberRequest = async (req, res) => {
  const { newPhoneNumber, oldPhoneNumber } = req.body;
  const userId = req.user.id;

  try {
    // Generate OTPs for both old and new phone numbers
    const oldOtp = generateOtp(6);
    const newOtp = generateOtp(6);

    // Check if OTP records already exist for both old and new phone numbers
    let oldOtpRecord = await Otp.findOne({ phoneNumber: oldPhoneNumber });
    let newOtpRecord = await Otp.findOne({ phoneNumber: newPhoneNumber });

    // Update or create OTP record for the old phone number
    if (oldOtpRecord) {
      oldOtpRecord.otp = oldOtp;
      await oldOtpRecord.save();
      console.log(`Updated OTP for old phone number: ${oldOtpRecord}`);
    } else {
      oldOtpRecord = new Otp({
        userId,
        phoneNumber: oldPhoneNumber,
        otp: oldOtp,
      });
      await oldOtpRecord.save();
      console.log(`Created OTP for old phone number: ${oldOtpRecord}`);
    }

    // Update or create OTP record for the new phone number
    if (newOtpRecord) {
      newOtpRecord.otp = newOtp;
      await newOtpRecord.save();
      console.log(`Updated OTP for new phone number: ${newOtpRecord}`);
    } else {
      newOtpRecord = new Otp({
        userId,
        phoneNumber: newPhoneNumber,
        otp: newOtp,
      });
      await newOtpRecord.save();
      console.log(`Created OTP for new phone number: ${newOtpRecord}`);
    }

    // Optional: Retry logic for sending OTP
    let smsSent = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!smsSent && attempts < maxAttempts) {
      try {
        // Replace with actual SMS sending logic here
        console.log(`Sending OTP attempt ${attempts + 1}`);
        smsSent = true; // Assume success for this example
      } catch (smsError) {
        attempts++;
        console.error(`Error sending OTP (attempt ${attempts}):`, smsError);
        if (attempts >= maxAttempts) {
          throw new Error("Failed to send OTP after multiple attempts");
        }
      }
    }

    res.status(200).json({
      message: "OTPs sent for phone number update",
      success: true,
    });
  } catch (error) {
    console.error("Error in updatePhoneNumberRequest:", error);
    res
      .status(500)
      .json({ message: "Error sending OTP", error: error.message });
  }
};

// Verify phone number change
exports.verifyPhoneNumberChange = async (req, res) => {
  const { oldPhoneNumber, newPhoneNumber, oldOtp, newOtp } = req.body;
  const userId = req.user.id;
  const maxAttempts = 300000;

  console.log(oldPhoneNumber, newPhoneNumber);
  try {
    let oldOtpRecord, newOtpRecord;
    let attempts = 0;

    // Fetch OTP records for both old and new phone numbers
    while ((!oldOtpRecord || !newOtpRecord) && attempts < maxAttempts) {
      try {
        oldOtpRecord = await Otp.findOne({
          phoneNumber: oldPhoneNumber,
          // userId,
        });
        newOtpRecord = await Otp.findOne({
          phoneNumber: newPhoneNumber,
          // userId,
        });

        console.log(oldOtp, oldOtpRecord, "Old phone number OTP verification");
        console.log(newOtp, newOtpRecord, "New phone number OTP verification");

        // Verify OTPs
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
        break;
      } catch (dbError) {
        attempts++;
        console.error(`Error fetching OTPs (attempt ${attempts}):`, dbError);
        if (attempts >= maxAttempts) {
          throw new Error("Failed to fetch OTPs after multiple attempts");
        }
      }
    }

    // Proceed with updating the user's phone number
    attempts = 0;
    let updateSuccess = false;
    while (!updateSuccess && attempts < maxAttempts) {
      try {
        await User.findByIdAndUpdate(userId, { phoneNumber: newPhoneNumber });
        updateSuccess = true;
      } catch (dbError) {
        attempts++;
        console.error(
          `Error updating phone number (attempt ${attempts}):`,
          dbError
        );
        if (attempts >= maxAttempts) {
          throw new Error(
            "Failed to update phone number after multiple attempts"
          );
        }
      }
    }

    // Clean up OTP records after successful update
    await Otp.deleteOne({ phoneNumber: oldPhoneNumber });
    await Otp.deleteOne({ phoneNumber: newPhoneNumber });

    res
      .status(200)
      .json({ message: "Phone number updated successfully", success: true });
  } catch (error) {
    console.error("Error verifying phone number change:", error);
    res.status(500).json({
      message: "Error verifying phone number change",
      error: error.message,
    });
  }
};
exports.getUserByPhoneNumber = async (req, res) => {
  const { phoneNumber } = req.body;
  console.log(phoneNumber, "phoneNumber");

  try {
    // Find user by phone number
    const user = await User.findOne({ phoneNumber }).select(
      "firstName lastName email verified createdAt pushNotifications newsletterSubscription promotionNotifications smsNotifications emailNotifications promoCode referralCode imageUrl"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the found user
    res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email.toLowerCase(), // Example adjustment for consistency
    });
  } catch (error) {
    console.error("Error fetching user by phone number:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.healthCheck = (req, res) => {
  try {
    // You can add any additional checks here, like checking the DB or other services
    console.log("Server is up and runningss");
    res
      .status(200)
      .send({ success: true, message: "Server is active and running" });
  } catch (err) {
    console.error("Error in health check:", err);
    res.status(500).send({ message: "Server is down" });
  }
};

// Update notification preferences (push, newsletter, promotions)
exports.updateNotificationPreferences = async (req, res) => {
  const {
    pushNotifications,
    emailNotifications,
    smsNotifications,
    newsletterSubscription,
    promotionNotifications,
    pickupCode,
  } = req.body;
  const userId = req.user.id; // Get user ID from JWT

  console.log(
    pushNotifications,
    emailNotifications,
    smsNotifications,
    newsletterSubscription,
    promotionNotifications,
    pickupCode
  );
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        pushNotifications,
        newsletterSubscription,
        promotionNotifications,
        smsNotifications,
        emailNotifications,
        pickupCode,
      },
      { new: true, select: "-password" } // Exclude password from the response
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log(updatedUser, "updatedUser");
    res.status(200).json({
      message: "Notification preferences updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating notification preferences:", error); // Log error
    res
      .status(500)
      .json({ message: "Error updating notification preferences", error });
  }
};
