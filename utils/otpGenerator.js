/**
 * utils/generateOtp.js
 * 
 * This file defines a utility function to generate a 6-digit OTP (One-Time Password)
 * that is used for phone number verification during account creation.
 */

const otpGenerator = require('otp-generator');

// Function to generate a 6-digit OTP
const generateOtp = () => {
  return otpGenerator.generate(6, {
    digits: true,        // Only digits
    alphabets: false,     // No alphabets
    upperCase: false,     // No uppercase letters
    specialChars: false   // No special characters
  });
};

module.exports = generateOtp;