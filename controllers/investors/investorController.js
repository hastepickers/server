// controllers/investors/investorController.js
const Investor = require("../../models/Investor/Investor");
const InvestorsOtp = require("../../models/Investor/InvestorsOtp");
const { sendEmail } = require("../../utils/emailUtils");
const jwt = require("jsonwebtoken");

/**
 * Generates a 6-digit OTP.
 * @returns {string} The generated OTP.
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

/**
 * Normalizes a phone number to the +234 format.
 * Handles numbers starting with '0' or '234'.
 * @param {string} phone The phone number to normalize.
 * @returns {string} The normalized phone number.
 */
const normalizePhoneNumber = (phone) => {
  if (!phone) return phone; // Return as is if null or undefined

  let normalizedPhone = String(phone).trim(); // Ensure it's a string and trim whitespace

  if (normalizedPhone.startsWith("0") && normalizedPhone.length === 11) {
    // Example: 08012345678 -> +2348012345678
    normalizedPhone = "+234" + normalizedPhone.slice(1);
  } else if (
    normalizedPhone.startsWith("234") &&
    normalizedPhone.length === 13
  ) {
    // Example: 2348012345678 -> +2348012345678
    normalizedPhone = "+".concat(normalizedPhone);
  } else if (
    !normalizedPhone.startsWith("+234") &&
    normalizedPhone.length === 10
  ) {
    // If it's 10 digits and doesn't start with +234, assume it's a local number without '0' prefix, e.g., 8012345678
    // This is a common case if users omit the leading '0'
    normalizedPhone = "+234" + normalizedPhone;
  }
  // If it already starts with +234 or doesn't match common patterns, leave as is.
  return normalizedPhone;
};

// Create Account
const createAccount = async (req, res) => {
  try {
    console.log("Incoming request to create account:", req.body);

    let {
      name,
      email,
      alternateEmail,
      role,
      investorShare,
      phone, // Get phone from request body
      address,
      joined,
    } = req.body;

    // Normalize phone number before using it
    phone = normalizePhoneNumber(phone);
    console.log("Normalized phone for createAccount:", phone);

    // Check if investor exists
    const existingInvestor = await Investor.findOne({ phone });
    console.log("Existing investor lookup result:", existingInvestor);

    if (existingInvestor) {
      console.log("Investor already exists with phone:", phone);
      return res
        .status(400)
        .json({ message: "Investor with this phone already exists" });
    }

    // Create investor first (unverified)
    const newInvestor = await Investor.create({
      name,
      email,
      alternateEmail,
      role,
      investorShare,
      phone,
      address,
      joined,
      verified: false, // add a flag in schema
    });
    console.log("New investor created but unverified:", newInvestor);

    // Schedule deletion after 30 minutes if still unverified
    setTimeout(async () => {
      const stillUnverified = await Investor.findOne({
        _id: newInvestor._id,
        verified: false,
      });
      if (stillUnverified) {
        await Investor.deleteOne({ _id: newInvestor._id });
        console.log(
          `Investor ${newInvestor._id} deleted after 30 mins (unverified)`
        );
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Generate OTP
    const otp = generateOtp();
    console.log("Generated OTP:", otp);

    // Save OTP
    await InvestorsOtp.create({ phone, email, otp });
    console.log("OTP record created in DB for:", phone);

    // Send OTP Email
    const emailHtml = `<h3>Welcome to Pickars Investors</h3>
                        <p>Your OTP is: <b>${otp}</b></p>`;
    await sendEmail(email, "OTP for Phone Number Verification", emailHtml);
    console.log("OTP email sent to:", email);

    res.status(200).json({
      message:
        "Account created. OTP sent to email. Please verify within 30 minutes.",
    });
  } catch (error) {
    console.error("Error in createAccount:", error);
    res
      .status(500)
      .json({ message: "Error creating account", error: error.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    console.log("Incoming login request:", req.body);

    let { phone } = req.body;

    // Normalize phone number
    phone = normalizePhoneNumber(phone);
    console.log("Normalized phone for login:", phone);

    const investor = await Investor.findOne({ phone });
    console.log("Investor lookup result:", investor);

    if (!investor) {
      console.log("No investor found with phone:", phone);
      return res.status(404).json({ message: "Investor not found" });
    }

    // generate OTP
    const otp = generateOtp();
    console.log("Generated OTP for login:", otp);

    const emailHtml = `<h3>Pickars Investor Login</h3>
                        <p>Your OTP is: <b>${otp}</b></p>`;

    await InvestorsOtp.create({ phone, email: investor.email, otp });
    console.log("OTP record created in DB for login:", phone);

    await sendEmail(investor.email, "OTP for Login Verification", emailHtml);
    console.log("Login OTP email sent to:", investor.email);

    res
      .status(200)
      .json({ message: "OTP sent to email. Please verify login." });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    console.log("Incoming verifyOtp request:", req.body);

    let { phone, otp } = req.body; // Use 'let' to allow re-assignment

    // Normalize phone number
    phone = normalizePhoneNumber(phone);
    console.log("Normalized phone for verifyOtp:", phone);

    // lookup OTP
    const record = await InvestorsOtp.findOne({ phone, otp });
    console.log("OTP lookup result:", record);

    if (!record) {
      console.log("Invalid or expired OTP for phone:", phone);
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // delete OTP after use
    await InvestorsOtp.deleteOne({ _id: record._id });
    console.log("OTP record deleted after verification for phone:", phone);

    // find investor
    let investor = await Investor.findOne({ phone });
    console.log("Investor lookup after OTP verification:", investor);

    if (!investor) {
      console.log("No investor found for phone:", phone);
      return res
        .status(404)
        .json({ message: "Investor not found. Please sign up first." });
    }

    // Mark as verified
    investor.verified = true;
    await investor.save();
    console.log("Investor marked as verified:", investor);

    // Generate JWT token
    const token = jwt.sign(
      { id: investor._id, phone: investor.phone },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    console.log("OTP verified successfully. Investor logged in:", investor);
    res.status(200).json({
      message: "OTP verified, login success",
      token,
      investor,
      success: true,
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res
      .status(500)
      .json({ message: "Error verifying OTP", error: error.message });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    console.log("Incoming resendOtp request:", req.body);

    let { phone } = req.body; // Use 'let' to allow re-assignment

    // Normalize phone number
    phone = normalizePhoneNumber(phone);
    console.log("Normalized phone for resendOtp:", phone);

    const investor = await Investor.findOne({ phone });
    console.log("Investor lookup for resend OTP:", investor);

    if (!investor) {
      console.log("No investor found with phone for resend:", phone);
      return res.status(404).json({ message: "Investor not found" });
    }

    // generate new OTP
    const otp = generateOtp();
    console.log("Generated new OTP for resend:", otp);

    const emailHtml = `<h3>Pickars Investors - Resend OTP</h3>
                        <p>Your new OTP is: <b>${otp}</b></p>`;

    await InvestorsOtp.create({ phone, email: investor.email, otp });
    console.log("New OTP record created in DB for:", phone);

    await sendEmail(investor.email, "Resend OTP Verification", emailHtml);
    console.log("Resent OTP email sent to:", investor.email);

    res.status(200).json({ message: "New OTP sent to email." });
  } catch (error) {
    console.error("Error in resendOtp:", error);
    res
      .status(500)
      .json({ message: "Error resending OTP", error: error.message });
  }
};


const getProfile = async (req, res) => {
    try {
      console.log("Incoming request to get profile:", req.params);
      let { phone } = req.params;
  
      // Normalize the phone number before searching
      phone = normalizePhoneNumber(phone);
      console.log("Normalized phone for getProfile:", phone);
  
      // Find the investor profile by the normalized phone number
      const investor = await Investor.findOne({ phone });
  
      if (!investor) {
        console.log("No investor found with phone:", phone);
        return res.status(404).json({ message: "Investor not found" });
      }
  
      // Return the investor profile, excluding sensitive data if any
      res.status(200).json({ investor });
    } catch (error) {
      console.error("Error in getProfile:", error);
      res
        .status(500)
        .json({ message: "Error fetching profile", error: error.message });
    }
  };


module.exports = { createAccount, getProfile, login, verifyOtp, resendOtp };
