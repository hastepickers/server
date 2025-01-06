// const User = require("../models/User");
// const Otp = require("../models/Otp");
const otpGenerator = require("otp-generator");
const jwt = require("jsonwebtoken");
const User = require("../../models/Customer/User");
const Otp = require("../../models/Customer/Otp");
const generateTokens = require("../../utils/generateTokens");
//const CustomerEarning = require("../../models/Customer/CustomerEarnings");

/**
 * controllers/authController.js
 *
 * This file contains all the logic for handling user authentication. It includes the following functions:
 *
 * - `register`: Creates a new user after checking if the phone number already exists.
 * - `verifyOtp`: Matches the OTP sent with the one stored in the database and verifies the user.
 * - `login`: Authenticates the user by checking phone number and password.
 * - `resendOtp`: Generates a new OTP and updates it in the OTP schema.
 * - `changePassword`: Updates the user's password by verifying the OTP and phone number.
 *
 * JWT tokens are generated after a successful OTP verification.
 */
const generateOtp = (length) => {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10); // Generate a random digit between 0 and 9
  }
  return otp;
};

// Create User
exports.createAccount = async (req, res) => {
  let { firstName, email, referralCode, lastName, phoneNumber, countryCode } =
    req.body;

  try {
    // Convert firstName, lastName, and email to lowercase
    firstName = firstName.toLowerCase();
    lastName = lastName.toLowerCase();
    email = email.toLowerCase();

    // Check if user already exists with the provided phone number
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this phone number already exists" });
    }

    // Create new user without password as per requirement
    const user = new User({
      firstName,
      lastName,
      phoneNumber,
      countryCode,
      email,
      referralCode,
    });

    await user.save();

    // Generate OTP
    const otp = generateOtp(6);
    console.log(otp, "Generated OTP");

    // Save OTP in the Otp model
    const otpRecord = new Otp({ phoneNumber, otp });
    await otpRecord.save();

    // Send OTP to the user's phone (Integration required with SMS service)

    res.status(201).json({
      message: "Account created successfully, OTP sent for verification",
    });
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ message: "Error creating account", error });
  }
};

exports.healthCheck = (req, res) => {
  try {
    // You can add any additional checks here, like checking the DB or other services

    res.status(200).send({ message: "Server is active and running" });
  } catch (err) {
    console.error("Error in health check:", err);
    res.status(500).send({ message: "Server is down" });
  }
};

exports.login = async (req, res) => {
  const { phoneNumber } = req.body;
  console.log(phoneNumber, "phoneNumber");

  try {
    // Find the user by phone number
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if an OTP already exists for this phone number
    let otpRecord = await Otp.findOne({ phoneNumber });

    let otp;
    if (otpRecord) {
      // If OTP record exists, update it with a new OTP
      const otp = generateOtp(6);
      otpRecord.otp = otp; // Update the OTP
      await otpRecord.save();
      console.log(otp, "Updated OTP");
    } else {
      // If no OTP record exists, create a new one
      const otp = generateOtp(6);
      otpRecord = new Otp({ phoneNumber, otp });
      await otpRecord.save();
      console.log(otp, "Generated OTP");
    }

    // Send OTP to the user's phone (Integration required with SMS service)
    // This would be where you integrate with an SMS service like Twilio

    res.status(200).json({ message: "OTP sent successfully for login" });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in", error });
  }
};
// Verify user account after OTP validation
const createMessageSupportIfNotExists = async (userId) => {
  try {
    const existingMessageSupport = await MessageSupport.findOne({ userId });
    if (!existingMessageSupport) {
      const messageSupport = new MessageSupport({
        userId,
        messages: [], // Initialize with an empty message array
      });
      await messageSupport.save();
      console.log(
        "MessageSupport document created successfully:",
        messageSupport
      );
    } else {
      console.log("MessageSupport document already exists for this user.");
    }
  } catch (error) {
    console.error("Error creating MessageSupport document:", error);
  }
};

exports.verifyNewAccount = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  try {
    const otpRecord = await Otp.findOne({ phoneNumber });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await User.findOneAndUpdate(
      { phoneNumber },
      { verified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // const customerEarning = new CustomerEarning({
    //   balance: 0,
    //   withdrawalPin: "defaultPin",
    //   userId: user._id,
    // });

    
    await customerEarning.save();

    await Otp.deleteOne({ phoneNumber });

    // Create a MessageSupport document if it doesn't already exist
    await createMessageSupportIfNotExists(user._id);

    const { accessToken, refreshToken } = generateTokens(user._id);

    res
      .status(200)
      .json({ message: "Account verified", accessToken, refreshToken });
  } catch (error) {
    console.error("Error verifying account:", error);
    res.status(500).json({ message: "Error verifying account", error });
  }
};

exports.verifyAccount = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  try {
    const otpRecord = await Otp.findOne({ phoneNumber });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    if (user.verified) {
      const { accessToken, refreshToken } = generateTokens(user._id);
      return res.status(200).json({
        message: "Account is already verified",
        success: true,
        accessToken,
        refreshToken,
        user: user,
      });
    }

    user.verified = true;
    await user.save();

    await Otp.deleteOne({ phoneNumber });

    // Create a MessageSupport document if it doesn't already exist
    await createMessageSupportIfNotExists(user._id);

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(200).json({
      message: "Account verified successfully",
      success: true,
      accessToken,
      refreshToken,
      user: user,
    });
  } catch (error) {
    console.error("Error verifying account:", error);
    res
      .status(500)
      .json({ message: "Error verifying account", error, success: false });
  }
};
exports.resendOtp = async (req, res) => {
  const { phoneNumber } = req.body;
  console.log(phoneNumber, "phoneNumber");
  try {
    // Check if user exists with the given phone number
    // const user = await User.findOne({ phoneNumber });

    // if (!user) {

    //   return res.status(404).json({ message: "User does not exist" });
    // }

    // Generate new OTP
    const otp = generateOtp(6);
    await Otp.findOneAndUpdate({ phoneNumber }, { otp }, { upsert: true });

    console.log(otp, "otp"); // For debugging purposes

    // Send OTP to phone (integration required with SMS service)
    // Here you would integrate your SMS sending service
    // e.g., await sendOtpToPhone(phoneNumber, otp);

    res.status(200).json({ message: "OTP resent" });
  } catch (error) {
    res.status(500).json({ message: "Error resending OTP", error });
  }
};

// Change Password
// Change Password
exports.changePassword = async (req, res) => {
  const { phoneNumber, newPassword, otp } = req.body;

  try {
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error); // Log the error for debugging
    res.status(500).json({ message: "Error changing password", error });
  }
};
// controllers/authController.js

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { phoneNumber } = req.body;
  try {
    // Check if the user exists
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Generate OTP
    const otp = generateOtp(6);
    console.log(otp, "otp");
    const otpRecord = new Otp({ phoneNumber, otp });
    await otpRecord.save();

    // Send OTP to phone (integration required with SMS service)

    res.status(200).json({ message: "OTP sent for password recovery" });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP", error });
  }
};

// Delete User Account
// Delete User Account and associated records in RequestARide and DriversMessage
exports.deleteAccount = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    // Find the user by phone number
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete associated CustomerEarning record
    await CustomerEarning.deleteOne({ userId: user._id });

    // Delete associated RequestARide records (where customerId or rider userId matches the user's ID)
    await RequestARide.deleteMany({
      $or: [{ "customer.customerId": user._id }, { "rider.userId": user._id }],
    });

    // Delete associated DriverMessages where sender or groupId matches the user's ID
    await DriversMessage.deleteMany({
      $or: [
        { "messages.sender": user._id.toString() },
        { groupId: user._id.toString() },
      ],
    });

    // Delete the user account
    await User.deleteOne({ phoneNumber });

    res
      .status(200)
      .json({ message: "Account and associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error); // Log the error for debugging
    res.status(500).json({ message: "Error deleting account", error });
  }
};
