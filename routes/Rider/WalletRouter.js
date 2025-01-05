const express = require("express");
const router = express.Router();

// Import the controller functions
const {
  getAllWithdrawals,
  getAllEarnings,
  getAllBonuses,
  getBanks,
  resolveAccount,
  requestWithdrawal,
  addWithdrawal,
  addEarnings,
  addAccountDetails,
  getAccountDetails,
} = require("../../controllers/Rider/WalletController");
const { verifyRiderTokenMiddleware } = require("../../utils/ridertokenUtil");

// Route to get all withdrawals
router.get("/withdrawals", verifyRiderTokenMiddleware, getAllWithdrawals);
router.post("/withdrawals", verifyRiderTokenMiddleware, addWithdrawal);

router.get("/account-details", verifyRiderTokenMiddleware, getAccountDetails);
router.post("/account-details", verifyRiderTokenMiddleware, addAccountDetails);

// Route to get all earnings
router.get("/earnings", verifyRiderTokenMiddleware, getAllEarnings);
router.get("/bonuses", verifyRiderTokenMiddleware, getAllBonuses);

// Route to list Paystack banks
router.get("/paystack/banks", verifyRiderTokenMiddleware, getBanks);
router.post("/earnings", verifyRiderTokenMiddleware, addEarnings);

// addEarnings Route to resolve Paystack account using account number and bank code
router.get(
  "/paystack/resolve-account",
  verifyRiderTokenMiddleware,
  resolveAccount
);

// Route to request a withdrawal
router.post(
  "/paystack/request-withdrawal",
  verifyRiderTokenMiddleware,
  requestWithdrawal
);

module.exports = router;
