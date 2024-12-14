const express = require("express");
const router = express.Router();
const authController = require("../../controllers/Customer/authController");

/**
 * routes/authRoutes.js
 *
 * This file defines the routes for authentication, including user registration, OTP verification, login,
 * resending OTPs, and changing passwords.
 *
 * Routes:
 * - POST /register: Registers a new user by saving details like firstName, lastName, phoneNumber, countryCode, and password.
 * - POST /verify: Verifies a user by matching the provided OTP with the one stored in the database.
 * - POST /login: Logs a user in by checking their phone number and password.
 * - POST /resend-otp: Resends a new OTP to the user's phone number if requested.
 * - POST /change-password: Allows the user to change their password using OTP and phone number verification.
 */

// Create Account
router.post("/register", authController.createAccount);

// Verify Account
router.post("/verify", authController.verifyAccount);

// Resend OTP
router.post("/resend-otp", authController.resendOtp);

// Login
router.post("/login", authController.login);

// Change Password
router.post("/change-password", authController.changePassword);

// forgot Password
router.post("/forgot-password", authController.forgotPassword);

//delete account
router.delete("/delete-account", authController.deleteAccount);

module.exports = router;
