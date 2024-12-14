// const User = require("../models/User");
// const Otp = require("../models/Otp");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/Customer/User");
const Otp = require("../../models/Customer/Otp");
const generateTokens = require("../../utils/generateTokens");
const CustomerEarning = require("../../models/Customer/CustomerEarnings");

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
    const otp = otpGenerator.generate(6, {
      digits: true,
      alphabets: false,
      upperCase: false,
      specialChars: false,
    });
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
      otp = otpGenerator.generate(6, {
        digits: true,
        alphabets: false,
        upperCase: false,
        specialChars: false,
      });
      otpRecord.otp = otp;  // Update the OTP
      await otpRecord.save();
      console.log(otp, "Updated OTP");
    } else {
      // If no OTP record exists, create a new one
      otp = otpGenerator.generate(6, {
        digits: true,
        alphabets: false,
        upperCase: false,
        specialChars: false,
      });
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
exports.verifyNewAccount = async (req, res) => {
  const { phoneNumber, otp } = req.body; // Extract phone number and OTP from the request body
  try {
    // Check for the OTP record associated with the provided phone number
    const otpRecord = await Otp.findOne({ phoneNumber });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" }); // Return an error if OTP is invalid
    }

    // Mark the user as verified in the database
    const user = await User.findOneAndUpdate(
      { phoneNumber },
      { verified: true },
      { new: true } // Return the updated user document
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" }); // Check if user exists
    }

    // Create a CustomerEarning record for the verified user
    const customerEarning = new CustomerEarning({
      balance: 0,
      withdrawalPin: "defaultPin", // Set a default withdrawal PIN
      userId: user._id, // Use user._id as the userId in CustomerEarning
    });
    await customerEarning.save(); // Save the customer earning record

    // Remove the OTP record to prevent reuse
    await Otp.deleteOne({ phoneNumber });

    // Generate JWT tokens for the user
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Respond with success message and tokens
    res
      .status(200)
      .json({ message: "Account verified", accessToken, refreshToken });
  } catch (error) {
    console.error("Error verifying account:", error); // Log any errors
    res.status(500).json({ message: "Error verifying account", error }); // Respond with a server error
  }
};

exports.verifyAccount = async (req, res) => {
  const { phoneNumber, otp } = req.body; // Extract phone number and OTP from the request body

  try {
    // Check if OTP record exists for the phone number and matches the provided OTP
    const otpRecord = await Otp.findOne({ phoneNumber });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    // Find the user by phone number
    const user = await User.findOne({ phoneNumber });

    // Check if user exists
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // Check if the user is already verified
    if (user.verified) {
      console.log("User is already verified.");
      // Even if already verified, generate tokens and respond with success
      const { accessToken, refreshToken } = generateTokens(user._id);
      return res.status(200).json({
        message: "Account is already verified",
        success: true,
        accessToken,
        refreshToken,
        user: user
      });
    }

    // Mark the user as verified
    user.verified = true;
    await user.save();

    // Delete the OTP record after successful verification
    await Otp.deleteOne({ phoneNumber });
    console.log(user, "user");

    // Generate JWT tokens for the user
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Respond with success message, success flag, and tokens
    res.status(200).json({
      message: "Account verified successfully",
      success: true,
      accessToken,
      refreshToken,
      user: user
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
    const otp = otpGenerator.generate(6, {
      digits: true,
      alphabets: false,
      upperCase: false,
      specialChars: false,
    });
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
    // Check if the OTP exists and matches
    const otpRecord = await Otp.findOne({ phoneNumber });
    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    const updatedUser = await User.findOneAndUpdate(
      { phoneNumber },
      { password: hashedPassword },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Optionally, delete the OTP record
    await Otp.deleteOne({ phoneNumber });

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
    const otp = otpGenerator.generate(6, {
      digits: true,
      alphabets: false,
      upperCase: false,
      specialChars: false,
    });
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

    // Delete the user account
    await User.deleteOne({ phoneNumber });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error); // Log the error for debugging
    res.status(500).json({ message: "Error deleting account", error });
  }
};
