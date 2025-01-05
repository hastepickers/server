const axios = require("axios");
const Withdrawal = require("../../models/Rider/RiderWithdrawal");
const Earning = require("../../models/Rider/RiderEarnings");
const Bonus = require("../../models/Rider/RiderBonus");
const Rider = require("../../models/Rider/RiderSchema");
const { default: mongoose } = require("mongoose");
// const { Withdrawal, Earning, Bonus, User } = require("../models"); // Make sure you have your models imported

const PAYSTACK_API_KEY = "your-paystack-api-key"; // Replace with your actual Paystack API key

// Add a withdrawal and link to rider
const addWithdrawal = async (req, res) => {
  const {
    riderId,
    amount,
    bank,
    accountName,
    accountNumber,
    status,
    withdrawalID,
    paystackDetails,
    // header,
  } = req.body;

  if (
    !riderId ||
    !amount ||
    !bank ||
    !accountName ||
    !accountNumber ||
    !status
    //||
    //!header
  ) {
    return res
      .status(400)
      .json({ message: "All required fields must be provided." });
  }

  try {
    // Check if the rider exists
    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res
        .status(404)
        .json({ message: "Rider not found.", success: false });
    }

    // Create the withdrawal
    const withdrawal = new Withdrawal({
      riderId,
      amount,
      bank,
      accountName,
      accountNumber,
      status,
      withdrawalID: withdrawalID || `WD${Date.now()}`,
      paystackDetails: paystackDetails || [],
      //header,
    });

    const savedWithdrawal = await withdrawal.save();

    // Link the withdrawal to the rider
    rider.withdrawals.push(savedWithdrawal._id);
    await rider.save();

    res.status(201).json({
      message: "Withdrawal added and linked to rider successfully.",
      withdrawal: savedWithdrawal,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while adding the withdrawal.",
      error: error.message,
      success: false,
    });
  }
};

// 1. Get All Withdrawals for a Specific Rider
const getAllWithdrawals = async (req, res) => {
  const riderId = req.riderId; // Assuming riderId is extracted from the request (e.g., middleware or token)

  try {
    // Find withdrawals for the rider, sort by time (descending), and limit to 5
    const withdrawals = await Withdrawal.find({ riderId })
      .sort({ time: -1 }) // Sort by time in descending order (most recent first)
      .limit(10) // Limit to the last 5 withdrawals
      .populate("riderId", "firstName lastName"); // Populate rider details

    res.status(200).json({ withdrawals, success: true }); // Return the results
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error fetching withdrawals.", error: error.message });
  }
};

// Controller function to add account details to a rider
const addAccountDetails = async (req, res) => {
  try {
    const riderId = req.riderId;
    const { accountNumber, accountName, bank, bankCode } = req.body;

    // Validate the input fields
    if (!accountNumber || !accountName || !bank || !bankCode) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // Find the rider by ID
    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found." });
    }

    // Add the account details to the rider's accountDetails array
    rider.accountDetails.push({ accountNumber, accountName, bank, bankCode });

    // Save the rider with updated account details
    await rider.save();

    // Respond with the updated rider data
    res.status(200).json({
      message: "Account details added successfully.",
      rider,
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error.", success: false });
  }
};

// Controller function to get account details for a rider
const getAccountDetails = async (req, res) => {
  try {
    const riderId = req.riderId;

    // Find the rider by ID and select only the accountDetails field
    const rider = await Rider.findById(riderId).select("accountDetails");

    if (!rider) {
      return res
        .status(404)
        .json({ message: "Rider not found.", success: false });
    }

    // Check if accountDetails exists for the rider
    if (rider.accountDetails.length === 0) {
      return res.status(404).json({
        message: "No account details found for this rider.",
        success: false,
      });
    }

    // Fetch all earnings for the rider and sum up the amounts
    const totalEarnings = await Earning.aggregate([
      { $match: { riderId: new mongoose.Types.ObjectId(riderId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const earningsSum = totalEarnings.length > 0 ? totalEarnings[0].total : 0;

    // Fetch all withdrawals for the rider with status 'pending' or 'success' and sum up the amounts
    const totalWithdrawals = await Withdrawal.aggregate([
      {
        $match: {
          riderId: new mongoose.Types.ObjectId(riderId),
          status: { $in: ["pending", "success"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const withdrawalsSum =
      totalWithdrawals.length > 0 ? totalWithdrawals[0].total : 0;

      console.log(withdrawalsSum, 'withdrawalsSum')
    // Calculate the balance
    const balance = earningsSum - withdrawalsSum;

    // Respond with the account details and balance
    res.status(200).json({
      message: "Account details retrieved successfully.",
      accountDetails: rider.accountDetails,
      success: true,
      balance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error.", success: false });
  }
};

// Ex

const addEarnings = async (req, res) => {
  const { riderId, amount, header, status } = req.body;

  // Validate that all required fields are provided
  if (!riderId || !amount || !header || !status) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Check if the rider exists
    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found." });
    }

    // Create new earning
    const newEarning = new Earning({
      riderId,
      amount,
      header,
      status,
    });

    // Save the new earning to the database
    const savedEarning = await newEarning.save();

    // Update rider's earnings (optional if you want to track earnings directly on the rider)
    rider.totalEarnings += amount;
    await rider.save();

    // Return success response
    res.status(201).json({
      message: "Earnings added successfully.",
      earning: savedEarning,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error adding earnings.",
      error: error.message,
      success: false,
    });
  }
};

// 2. Get All Earnings for a Specific Rider
const getAllEarnings = async (req, res) => {
  const riderId = req.riderId; // Assuming riderId is extracted from the request (e.g., middleware or token)

  try {
    // Find earnings for the rider, sort by the `_id` field (assuming it reflects creation time), and limit to 5
    const earnings = await Earning.find({ riderId })
      .sort({ _id: -1 }) // Sort by the `_id` field in descending order
      .limit(5) // Limit to the last 5 earnings
      .populate("riderId", "firstName lastName"); // Populate rider details

    res.status(200).json({ earnings, success: true }); // Return the results
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching earnings.",
      error: error.message,
      success: false,
    });
  }
};

// 3. Get All Bonuses for a Specific Rider
const getAllBonuses = async (req, res) => {
  const riderId = req.riderId; // Get riderId from request

  try {
    const bonuses = await Bonus.find({ riderId }).populate(
      "userId",
      "firstName lastName"
    ); // Populate user details

    res.status(200).json(bonuses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching bonuses." });
  }
};

// 4. List Paystack Banks (No rider-specific data needed)
const getBanks = async (req, res) => {
  try {
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${PAYSTACK_API_KEY}`,
      },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error communicating with Paystack" });
  }
};

// 5. Resolve Paystack Account (No rider-specific data needed)
const resolveAccount = async (req, res) => {
  const { account_number, bank_code } = req.query;

  if (!account_number || !bank_code) {
    return res
      .status(400)
      .json({ message: "Both account_number and bank_code are required" });
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_API_KEY}`,
        },
      }
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error parsing response:", error);
    res.status(500).json({ message: "Error connecting to Paystack", error });
  }
};

// 6. Request Withdrawal for a Specific Rider
const requestWithdrawal = async (req, res) => {
  const {
    accountNumber,
    accountName,
    bank,
    bankCode,
    requestedAmount,
    riderId, // Use riderId from the request body or get it from req.riderId if needed
    withdrawalID,
  } = req.body;

  try {
    // Convert requested amount to numeric
    const numericAmount = Number(requestedAmount);

    // Validate the requestedAmount
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Invalid requestedAmount. It must be a positive number.",
      });
    }

    // Create a new withdrawal using the Withdrawal model
    const newWithdrawal = new Withdrawal({
      riderId, // Use riderId here
      accountNumber,
      accountName,
      bank,
      bankCode,
      requestedAmount: numericAmount,
      withdrawalID,
      status: "Pending", // Set initial status to Pending
    });

    await newWithdrawal.save();

    // Optionally, update the user's withdrawals and totals
    const user = await User.findById(riderId);
    if (user) {
      user.withdrawals.push({
        amount: numericAmount,
        date: new Date(),
        accountNumber,
        status: "pending",
        accountName,
        bank,
        withdrawalID,
      });

      // Update the total balance, total earnings, and total withdrawals
      user.totalBalance -= numericAmount;
      user.totalEarnings -= numericAmount;
      user.totalWithdrawals += numericAmount;

      await user.save();

      res
        .status(201)
        .json({ message: "Withdrawal request submitted successfully." });
    } else {
      res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error processing withdrawal request." });
  }
};

module.exports = {
  addWithdrawal,
  getAllWithdrawals,
  getAllEarnings,
  getAllBonuses,
  getBanks,
  resolveAccount,
  requestWithdrawal,
  addEarnings,
  getAccountDetails,
  addAccountDetails,
};
