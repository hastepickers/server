
//const Company = require("../models/Company");
const { generateCompanyToken } = require("../../utils/ridertokenUtil");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const CompanyOTP = require("../../models/Rider/CompanyOTP");
const Company = require("../../models/Rider/CompanySchema");

// // Email setup
// const transporter = nodemailer.createTransport({
//   service: "Gmail",
//   auth: {
//     user: "your-email@gmail.com",
//     pass: "your-password",
//   },
// });

// Login company
exports.loginCompany = async (req, res) => {
  try {
    const { email, password } = req.body;

    const company = await Company.findOne({ email });
    if (!company) return res.status(404).json({ message: "Company not found" });

    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const tokens = generateCompanyToken(company._id);
    res.status(200).json({ message: "Login successful", tokens });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reset password
exports.resetCompanyPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const company = await Company.findOne({ email });
    if (!company) return res.status(404).json({ message: "Company not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    company.password = hashedPassword;
    await company.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a company
exports.createCompany = async (req, res) => {
  try {
    const {
      companyName,
      email,
      password,
      registeredCompanyNumber,
      businessName,
      registeredBusinessNumber,
    } = req.body;

    const company = new Company({
      companyName,
      email,
      password,
      registeredCompanyNumber,
      businessName,
      registeredBusinessNumber,
    });

    await company.save();
    res.status(201).json({ message: "Company created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a company
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedCompany = await Company.findByIdAndUpdate(id, updates, {
      new: true,
    });
    if (!updatedCompany)
      return res.status(404).json({ message: "Company not found" });

    res
      .status(200)
      .json({ message: "Company updated successfully", updatedCompany });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const company = await Company.findOne({ email });
    if (!company)
      return res.status(404).json({ message: "Email not registered" });

    const otp = crypto.randomInt(100000, 999999).toString();
    await CompanyOTP.findOneAndUpdate(
      { email },
      { email, otp },
      { upsert: true, new: true }
    );

    // Simulate sending OTP via email
    console.log(`OTP for ${email}: ${otp}`);
    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const companyOtp = await CompanyOTP.findOne({ email });
    if (!companyOtp || companyOtp.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const otp = crypto.randomInt(100000, 999999).toString();
    await CompanyOTP.findOneAndUpdate(
      { email },
      { email, otp },
      { upsert: true, new: true }
    );

    // Simulate sending OTP via email
    console.log(`New OTP for ${email}: ${otp}`);
    res.status(200).json({ message: "OTP resent to email" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const company = await Company.findOne({ email });
    if (!company) return res.status(404).json({ message: "Company not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    company.password = hashedPassword;
    await company.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
