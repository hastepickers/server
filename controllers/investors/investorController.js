const mongoose = require("mongoose");
const CompanyEarning = require("../../models/Investor/CompanyExpense");
const RequestARideSchema = require("../../models/Customer/RequestARideSchema");
const Investor = require("../../models/Investor/Investor");
const InvestorsOtp = require("../../models/Investor/InvestorsOtp");
const { sendEmail } = require("../../utils/emailUtils");
const jwt = require("jsonwebtoken");
const CompanyExpense = require("../../models/Investor/CompanyExpense");

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
  if (!phone) return phone;
  let normalizedPhone = String(phone).trim();
  if (normalizedPhone.startsWith("0") && normalizedPhone.length === 11) {
    normalizedPhone = "+234" + normalizedPhone.slice(1);
  } else if (
    normalizedPhone.startsWith("234") &&
    normalizedPhone.length === 13
  ) {
    normalizedPhone = "+".concat(normalizedPhone);
  } else if (
    !normalizedPhone.startsWith("+234") &&
    normalizedPhone.length === 10
  ) {
    normalizedPhone = "+234" + normalizedPhone;
  }
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

const getStartOfDay = (daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Utility function to get the start of a week, month, etc.
const getStartDate = (monthsAgo = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getRideStats = async (req, res) => {
  try {
    const today = getStartOfDay(0);
    const yesterday = getStartOfDay(1);
    const threeDaysAgo = getStartOfDay(2);
    const sevenDaysAgo = getStartOfDay(6);
    const twoWeeksAgo = getStartOfDay(13);
    const oneMonthAgo = getStartDate(1);
    const threeMonthsAgo = getStartDate(3);
    const sixMonthsAgo = getStartDate(6);
    const oneYearAgo = getStartDate(12);

    // Helper to get both count & sum for a time range
    const getStats = async (from, to = new Date()) => {
      const stats = await RequestARideSchema.aggregate([
        { $match: { createdAt: { $gte: from, $lt: to } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalPrice" },
          },
        },
      ]);

      return stats[0] || { count: 0, totalAmount: 0 };
    };

    const ridesData = {
      today: await getStats(today),
      yesterday: await getStats(yesterday, today),
      threeDays: await getStats(threeDaysAgo),
      sevenDays: await getStats(sevenDaysAgo),
      twoWeeks: await getStats(twoWeeksAgo),
      oneMonth: await getStats(oneMonthAgo),
      threeMonths: await getStats(threeMonthsAgo),
      sixMonths: await getStats(sixMonthsAgo),
      oneYear: await getStats(oneYearAgo),
    };

    res.status(200).json({ success: true, data: ridesData });
  } catch (error) {
    console.error("Error in getRideStats:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPaidAndEndedRides = async (req, res) => {
  try {
    const paidAndEndedRides = await RequestARideSchema.aggregate([
      {
        // Filter for rides that have been both paid and ended
        $match: {
          "paid.isPaid": true,
          "endRide.isEnded": true,
        },
      },
      {
        // Reshape the documents to match the front-end data structure
        $project: {
          _id: 0, // Exclude the default _id field
          id: "$_id", // Map the _id to a new field named 'id'
          paid: "$totalPrice",
          // Calculate company earnings as 30% of the total price
          companyEarnings: { $multiply: ["$totalPrice", 0.3] },
          // Return ISO date string (frontend will format)
          date: {
            $dateToString: {
              format: "%Y-%m-%d %H:%M:%S",
              date: "$createdAt",
            },
          },
          // Extract the year and month from the creation date
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
      },
      {
        // Sort the results by createdAt, from newest to oldest
        $sort: { date: -1 },
      },
    ]);

    res.status(200).json({ success: true, data: paidAndEndedRides });
  } catch (error) {
    console.error("Error in getPaidAndEndedRides:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching rides history",
      error: error.message,
    });
  }
};

// =========================================================================
// NEW FINANCIAL CONTROLLER FUNCTIONS
// =========================================================================

// GET all company expenses for a given month and year
// GET all expenses for a year
// GET all company expenses (by month+year OR full year)
const getCompanyExpenses = async (req, res) => {
  try {
    const { year, month } = req.query;
    console.log("📥 Incoming request to get company expenses:", req.query);

    if (!year) {
      console.log("❌ Year missing in query");
      return res.status(400).json({ message: "Year is required." });
    }

    let expenses;

    if (month) {
      // Fetch all expenses for the given year + month
      expenses = await CompanyExpense.find({ year, month });
      console.log(
        `✅ Found ${expenses.length} expense docs for year ${year}, month ${month}`
      );
    } else {
      // Fetch all expenses for the given year (all months)
      expenses = await CompanyExpense.find({ year });
      console.log(`✅ Found ${expenses.length} expense docs for year ${year}`);
    }

    res.status(200).json({
      success: true,
      data: expenses,
      summary: {
        total: expenses.reduce((acc, doc) => acc + (doc.total || 0), 0),
        count: expenses.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching company expenses:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching company expenses",
      error: error.message,
    });
  }
};

// ADD a new expense item to a company expense document
// ADD a new expense (creates a new document)
const addCompanyExpense = async (req, res) => {
  try {
    const { year, month, title, amount, category, notes } = req.body;
    console.log("📥 Incoming request to add expense:", req.body);

    if (!year || !month || !title || !amount) {
      return res
        .status(400)
        .json({ message: "Year, month, title, and amount are required." });
    }

    const newExpense = new CompanyExpense({
      year,
      month,
      title,
      amount,
      category,
      notes,
    });

    await newExpense.save();
    console.log("✅ Expense added successfully:", newExpense);

    res.status(201).json({
      success: true,
      message: "Expense added successfully",
      data: newExpense,
    });
  } catch (error) {
    console.error("❌ Error adding company expense:", error);
    res.status(500).json({
      success: false,
      message: "Error adding company expense",
      error: error.message,
    });
  }
};

// UPDATE a specific expense by _id
const updateCompanyExpense = async (req, res) => {
  try {
    const { expenseId, title, amount, category, notes } = req.body;
    console.log("📥 Incoming request to update expense:", req.body);

    if (!expenseId) {
      return res.status(400).json({ message: "expenseId is required." });
    }

    const updatedExpense = await CompanyExpense.findByIdAndUpdate(
      expenseId,
      { title, amount, category, notes },
      { new: true }
    );

    if (!updatedExpense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    console.log("✅ Expense updated successfully:", updatedExpense);

    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: updatedExpense,
    });
  } catch (error) {
    console.error("❌ Error updating company expense:", error);
    res.status(500).json({
      success: false,
      message: "Error updating company expense",
      error: error.message,
    });
  }
};

// DELETE a specific expense by _id
const deleteCompanyExpense = async (req, res) => {
  try {
    const { expenseId } = req.body;

    if (!expenseId) {
      return res.status(400).json({ message: "expenseId is required." });
    }

    const deletedExpense = await CompanyExpense.findByIdAndDelete(expenseId);

    if (!deletedExpense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    console.log("✅ Expense deleted successfully:", deletedExpense);

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
      data: deletedExpense,
    });
  } catch (error) {
    console.error("❌ Error deleting company expense:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting company expense",
      error: error.message,
    });
  }
};
// ADD a new company earning
const addOtherEarning = async (req, res) => {
  try {
    const { year, month, title, amount, date } = req.body;
    if (!year || !month || !title || !amount) {
      return res
        .status(400)
        .json({ message: "Year, month, title, and amount are required." });
    }

    let earningsDoc = await CompanyEarning.findOne({ year, month });

    if (!earningsDoc) {
      earningsDoc = new CompanyEarning({ year, month, earnings: [], total: 0 });
    }

    earningsDoc.earnings.push({ title, amount, date });
    earningsDoc.total += amount;

    await earningsDoc.save();
    res.status(201).json({
      success: true,
      message: "Earning added successfully",
      data: earningsDoc,
    });
  } catch (error) {
    console.error("Error adding other earning:", error);
    res.status(500).json({
      success: false,
      message: "Error adding other earning",
      error: error.message,
    });
  }
};

const getFinancialSummary = async (req, res) => {
  try {
    const { year, month, investorId } = req.body;
    console.log("📥 Incoming request for financial summary:", req.body);

    if (!year || !month || !investorId) {
      console.log("❌ Missing required fields (year, month, investorId)");
      return res.status(400).json({
        message:
          "Year, month, and investorId are required in the request body.",
      });
    }

    const monthNumber = parseInt(month, 10);
    const yearNumber = parseInt(year, 10);
    console.log(`ℹ️ Parsed year and month: ${yearNumber}-${monthNumber}`);

    // Fetch investor
    const investor = await Investor.findById(investorId);
    if (!investor) {
      console.log(`❌ Investor not found with ID: ${investorId}`);
      return res.status(404).json({ message: "Investor not found." });
    }
    console.log(
      `ℹ️ Found investor: ${investor.name}, Share: ${investor.investorShare}%`
    );

    // 1. Get total ride earnings for the month and year
    const rideEarnings = await RequestARideSchema.aggregate([
      {
        $match: {
          "paid.isPaid": true,
          "endRide.isEnded": true,
          $expr: {
            $and: [
              { $eq: [{ $year: "$createdAt" }, yearNumber] },
              { $eq: [{ $month: "$createdAt" }, monthNumber] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$totalPrice" },
        },
      },
    ]);
    const totalIncome = rideEarnings[0]?.totalIncome || 0;
    console.log(`ℹ️ Total ride income: ₦${totalIncome}`);

    // 2. Get total company expenses for the month and year
    const companyExpenses = await CompanyExpense.aggregate([
      {
        $match: { year: yearNumber, month: monthNumber },
      },
      {
        $group: { _id: null, totalExpenses: { $sum: "$amount" } },
      },
    ]);
    const totalExpenses = companyExpenses[0]?.totalExpenses || 0;
    console.log(`ℹ️ Total company expenses: ₦${totalExpenses}`);

    // 3. Calculate total balance
    const totalBalance = totalIncome - totalExpenses;
    console.log(`✅ Total balance: ₦${totalBalance}`);

    // 4. Calculate investor's payout
    const investorSharePercent = investor.investorShare;
    const investorPayout = (totalBalance * investorSharePercent) / 100;
    console.log(
      `💰 Investor ${investor.name} payout (${investorSharePercent}%): ₦${investorPayout}`
    );

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        totalBalance,
        investor: {
          id: investor._id,
          name: investor.name,
          sharePercent: investorSharePercent,
          payout: investorPayout,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching financial summary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching financial summary",
      error: error.message,
    });
  }
};

module.exports = {
  createAccount,
  getProfile,
  login,
  getRideStats,
  verifyOtp,
  resendOtp,
  getPaidAndEndedRides,
  getCompanyExpenses,
  addCompanyExpense,
  updateCompanyExpense,
  deleteCompanyExpense,
  addOtherEarning,
  getFinancialSummary,
};
