// const Charge = require("../../models/Customer/Charge");
// const CustomerEarning = require("../../models/Customer/CustomerEarnings");
// //const Otp = require("../../models/Customer/Otp"); // Assuming this is the OTP model
// const Otp = require("../../models/Customer/Otp");
// //
// //const { sendOtpToPhone } = require("../../utils/otpService"); // Utility function to send OTP

// // Get all earnings
// exports.getAllEarnings = async (req, res) => {
//   try {
//     const earnings = await CustomerEarning.find(
//       { userId: req.user.id },
//       "earnings"
//     ); // Use req.user.id
//     res.status(200).json(earnings);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching earnings", error });
//   }
// };

// // Get all withdrawals
// exports.getAllWithdrawals = async (req, res) => {
//   try {
//     const withdrawals = await CustomerEarning.find(
//       { userId: req.user.id },
//       "withdrawals"
//     ); // Use req.user.id
//     res.status(200).json(withdrawals);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching withdrawals", error });
//   }
// };

// // Get all customer earnings
// exports.getCustomerEarnings = async (req, res) => {
//   try {
//     const customerEarning = await CustomerEarning.findOne({
//       userId: req.user.id,
//     }); // Use req.user.id
//     if (!customerEarning) {
//       return res.status(404).json({ message: "Customer earning not found" });
//     }
//     res.status(200).json(customerEarning);
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error fetching customer earnings", error });
//   }
// };

// // Request OTP for withdrawal PIN update
// exports.requestOtp = async (req, res) => {
//   const { phoneNumber } = req.body; // Assuming the phone number is passed in the request body

//   try {
//     // Check if the phone number already exists in the OTP schema
//     let otpEntry = await Otp.findOne({ phoneNumber });

//     // Generate a new OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
//     console.log(otp, "yeahh");
//     if (otpEntry) {
//       // Update the OTP if entry already exists
//       otpEntry.otp = otp;
//       otpEntry.createdAt = Date.now(); // Update timestamp
//       await otpEntry.save();
//     } else {
//       // Create a new OTP entry
//       otpEntry = new Otp({ phoneNumber, otp });
//       await otpEntry.save();
//     }

//     // Send the OTP to the user's phone
//     //await sendOtpToPhone(phoneNumber, otp); // You need to implement this utility function

//     res.status(200).json({ message: "OTP sent successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Error requesting OTP", error });
//   }
// };

// // Set withdrawal PIN with OTP verification
// exports.setWithdrawalPin = async (req, res) => {
//   const { pin, otp, phoneNumber } = req.body; // Get the pin and otp from request body
//   try {
//     // Check if the OTP is valid
//     const otpEntry = await Otp.findOne({
//       phoneNumber: phoneNumber,
//     }); // Assuming phoneNumber is in req.user

//     console.log(otpEntry, "otpEntry");
//     if (!otpEntry || otpEntry.otp !== otp) {
//       return res.status(400).json({ message: "Invalid OTP" });
//     }

//     const customerEarning = await CustomerEarning.findOne({
//       userId: req.user.id,
//     }); // Use req.user.id
//     if (!customerEarning) {
//       return res.status(404).json({ message: "Customer earning not found" });
//     }

//     customerEarning.withdrawalPin = pin; // Set withdrawal pin
//     await customerEarning.save();

//     // Optionally, delete or invalidate the OTP after successful use
//     await Otp.deleteOne({ phoneNumber: req.user.phoneNumber });

//     res.status(200).json({ message: "Withdrawal PIN set successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Error setting withdrawal PIN", error });
//   }
// };

// exports.updateWithdrawalPin = async (req, res) => {
//   const { phoneNumber, otp, newPin } = req.body;
//   try {
//     const otpEntry = await Otp.findOne({ phoneNumber });
//     if (!otpEntry) {
//       return res
//         .status(400)
//         .json({ message: "No OTP found for this phone number" });
//     }
//     if (otpEntry.otp !== otp) {
//       return res.status(400).json({ message: "Invalid OTP" });
//     }
//     const customerEarning = await CustomerEarning.findOne({
//       userId: req.user.id,
//     });
//     if (!customerEarning) {
//       return res.status(404).json({ message: "Customer earning not found" });
//     }
//     customerEarning.withdrawalPin = newPin;
//     await customerEarning.save();
//     await Otp.deleteOne({ phoneNumber });
//     res.status(200).json({ message: "Withdrawal PIN updated successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Error updating withdrawal PIN", error });
//   }
// };

// exports.placeWithdrawal = async (req, res) => {
//     const { accountName, accountNumber, bank_code, country_code, amount, withdrawalPin, accountType } = req.body;
    
//     try {
//       // Find the customer's earnings by their user ID
//       const customerEarning = await CustomerEarning.findOne({ userId: req.user.id });
  
//       if (!customerEarning) {
//         return res.status(404).json({ message: "Customer earnings not found" });
//       }
  
//       // Verify the withdrawal PIN
//       const isPinValid = await customerEarning.verifyWithdrawalPin(withdrawalPin);
  
//       if (!isPinValid) {
//         return res.status(400).json({ message: "Invalid withdrawal PIN" });
//       }
  
//       // Calculate the current balance
//       const currentBalance = customerEarning.calculateBalance();
  
//       // Check if the user has sufficient balance (including the charge)
//       const totalAmount = amount + 100; // 100 charge
//       if (totalAmount > customerEarning.balance) {
//         return res.status(400).json({ message: "Insufficient balance to cover withdrawal and charge" });
//       }
  
//       // Deduct the total amount (withdrawal + charge) from the balance
//       customerEarning.balance -= totalAmount;
  
//       // Create a new withdrawal object
//       const newWithdrawal = {
//         accountName,
//         accountWithdrawnTo: accountNumber,
//         bank_code,
//         country_code,
//         amountWithdrawn: totalAmount,
//         account_type: accountType,
//         status: "pending", // Initial status set to 'pending'
//       };
  
//       // Add the withdrawal to the withdrawals array
//       customerEarning.withdrawals.push(newWithdrawal);
  
//       // Save the updated customer earnings with new balance and withdrawal details
//       await customerEarning.save();
  
//       // Log the charge in the Charges model 
//       const chargeLog = new Charge({
//         userId: req.user.id,
//         withdrawalId: customerEarning.withdrawals[customerEarning.withdrawals.length - 1]._id, // Get the withdrawal ID of the recently added withdrawal
//         chargeAmount: 100,
//         status: "success", // You can dynamically set this based on logic
//       });
//       await chargeLog.save();
  
//       // Respond to the client
//       res.status(201).json({
//         message: "Withdrawal request placed successfully with a charge of 100",
//         withdrawal: newWithdrawal,
//         charge: chargeLog
//       });
  
//     } catch (error) {
//       res.status(500).json({ message: "Error placing withdrawal", error });
//     }
//   };


//   exports.updateWithdrawalStatus = async (req, res) => {
//     const { withdrawalId } = req.params;
//     const { status } = req.body;
  
//     // Ensure that the status is either 'success' or 'failed'
//     if (!['success', 'failed'].includes(status)) {
//       return res.status(400).json({ message: "Invalid status. Allowed values are 'success' or 'failed'." });
//     }
  
//     try {
//       // Find the customerEarning document containing the withdrawal
//       const customerEarning = await CustomerEarning.findOne({ 'withdrawals._id': withdrawalId });
      
//       if (!customerEarning) {
//         return res.status(404).json({ message: "Withdrawal not found" });
//       }
  
//       // Find the specific withdrawal by ID
//       const withdrawal = customerEarning.withdrawals.id(withdrawalId);
      
//       if (!withdrawal) {
//         return res.status(404).json({ message: "Withdrawal not found" });
//       }
  
//       // Update the withdrawal status
//       withdrawal.status = status;
  
//       // Save the updated document
//       await customerEarning.save();
  
//       res.status(200).json({
//         message: `Withdrawal status updated to ${status}`,
//         withdrawal,
//       });
  
//     } catch (error) {
//       res.status(500).json({ message: "Error updating withdrawal status", error });
//     }
//   };
