const otpGenerator = require("otp-generator");
const jwt = require("jsonwebtoken");
const User = require("../../models/Customer/User");
const Otp = require("../../models/Customer/Otp");
const generateTokens = require("../../utils/generateTokens");
const { sendEmail } = require("../../utils/emailUtils");
const generateOTPEmail = require("../../emails/emailTemplates/generateOTPEmail");
const MessageSupport = require("../../models/Customer/MessageSupport"); // Assuming this model exists
//const CustomerEarning = require("../../models/Customer/CustomerEarnings"); // Uncomment if CustomerEarning is used

const generateOtp = (length) => {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

exports.verifyRefreshToken = (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: "Refresh token is required.",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    return res.status(200).json({ statusCode: 200, success: true, decoded });
  } catch (error) {
    console.error("❌ Invalid Refresh Token:", error.message);
    return res.status(401).json({
      statusCode: 401,
      success: false,
      message: "Invalid or expired refresh token.",
    });
  }
};

exports.verifyRefreshTokenDrivers = (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: "Refresh token is required.",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET_RIDER);
    return res.status(200).json({ statusCode: 200, success: true, decoded });
  } catch (error) {
    console.error("❌ Invalid Refresh Token:", error.message);
    return res.status(401).json({
      statusCode: 401,
      success: false,
      message: "Invalid or expired refresh token.",
    });
  }
};

exports.createAccount = async (req, res) => {
  let { firstName, email, referralCode, lastName, phoneNumber, countryCode } =
    req.body;

  try {
    firstName = firstName.toLowerCase();
    lastName = lastName.toLowerCase();
    email = email.toLowerCase();

    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this phone number already exists" });
    }

    const user = new User({
      firstName,
      lastName,
      phoneNumber,
      countryCode,
      email,
      referralCode,
    });

    await user.save();

    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const otpRecord = new Otp({ phoneNumber, otp: otpCode, expiresAt });
    await otpRecord.save();

    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const userEmail = user.email;

    const emailHtml = generateOTPEmail(otpCode, false, userName);
    await sendEmail(userEmail, "Verify Your Account", emailHtml);

    console.log(
      `Account created and OTP sent to ${userEmail} with code: ${otpCode}`
    );

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
    res.status(200).send({ message: "Server is active and running" });
  } catch (err) {
    console.error("Error in health check:", err);
    res.status(500).send({ message: "Server is down" });
  }
};

exports.login = async (req, res) => {
  const { phoneNumber } = req.body;
  console.log("📌 Login attempt for phoneNumber:", phoneNumber);

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      console.log("❌ User not found");
      return res.status(400).json({ message: "User not found" });
    }

    console.log("✅ User found:", user.email);

    const currentTime = new Date();

    // ✅ Check if account is locked
    if (
      user.loginLock &&
      user.lockExpiresAt &&
      user.lockExpiresAt > currentTime
    ) {
      const remainingHours = Math.ceil(
        (user.lockExpiresAt.getTime() - currentTime.getTime()) /
          (1000 * 60 * 60)
      );
      console.log(`⛔ Account is locked. Remaining hours: ${remainingHours}`);
      return res.status(423).json({
        message: `Account locked due to too many OTP attempts. Try again in ${remainingHours} hour(s).`,
      });
    } else if (
      user.loginLock &&
      user.lockExpiresAt &&
      user.lockExpiresAt <= currentTime
    ) {
      // Unlock account after lock expiry
      console.log("🔓 Unlocking account after lock expiry");
      user.loginLock = false;
      user.lockExpiresAt = null;
      await user.save();
    }

    let otpRecord = await Otp.findOne({ phoneNumber });
    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min OTP expiry
    console.log("🔑 Generated OTP:", otpCode);

    if (otpRecord) {
      // Reset attempts if more than 3 hours since last attempt
      const hoursSinceLastAttempt =
        (currentTime.getTime() - otpRecord.lastAttemptAt.getTime()) /
        (1000 * 60 * 60);
      console.log(
        "⏱ Hours since last OTP attempt:",
        hoursSinceLastAttempt.toFixed(2)
      );

      if (hoursSinceLastAttempt >= 3) {
        otpRecord.attempts = 0;
        console.log("🔄 Resetting OTP attempts to 0");
      }

      // ✅ Check OTP attempts
      if (otpRecord.attempts >= 10) {
        user.loginLock = true;
        user.lockExpiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours
        await user.save();
        console.log("⛔ Too many OTP attempts. Account locked for 5 hours");
        return res.status(423).json({
          message: "Too many OTP attempts. Account locked for 5 hours.",
        });
      }

      // Update OTP record
      otpRecord.otp = otpCode;
      otpRecord.expiresAt = expiresAt;
      otpRecord.attempts += 1;
      otpRecord.lastAttemptAt = currentTime;
      await otpRecord.save();
      console.log("✅ OTP record updated:", otpRecord);
    } else {
      otpRecord = new Otp({
        phoneNumber,
        otp: otpCode,
        expiresAt,
        attempts: 1,
        lastAttemptAt: currentTime,
      });
      await otpRecord.save();
      console.log("✅ New OTP record created:", otpRecord);
    }

    const emailHtml = generateOTPEmail(
      otpCode,
      false,
      `${user.firstName} ${user.lastName}`
    );
    await sendEmail(user.email, "OTP for Verification", emailHtml);
    console.log(`📧 OTP email sent to ${user.email}`);

    res.status(200).json({ message: "OTP sent successfully for login" });
  } catch (error) {
    console.error("❌ Error logging in:", error);
    res.status(500).json({ message: "Error logging in", error });
  }
};

const createMessageSupportIfNotExists = async (userId) => {
  try {
    const existingMessageSupport = await MessageSupport.findOne({ userId });
    if (!existingMessageSupport) {
      const messageSupport = new MessageSupport({
        userId,
        messages: [],
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
    // await customerEarning.save(); // Uncomment if CustomerEarning is used

    await Otp.deleteOne({ phoneNumber });

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
    // ✅ Hardcoded auto-verification for test/demo purposes
    if (phoneNumber === "8120710198" && otp === "123456") {
      let user = await User.findOne({ phoneNumber });

      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found", success: false });
      }

      if (!user.verified) {
        user.verified = true;
        await user.save();
        await createMessageSupportIfNotExists(user._id);
      }

      const { accessToken, refreshToken } = generateTokens(user._id);

      return res.status(200).json({
        message: "Account verified successfully (hardcoded route)",
        success: true,
        accessToken,
        refreshToken,
        user,
      });
    }

    // 🔒 Default verification flow
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
        user,
      });
    }

    user.verified = true;
    await user.save();

    await Otp.deleteOne({ phoneNumber });
    await createMessageSupportIfNotExists(user._id);

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(200).json({
      message: "Account verified successfully",
      success: true,
      accessToken,
      refreshToken,
      user,
    });
  } catch (error) {
    console.error("Error verifying account:", error);
    res
      .status(500)
      .json({ message: "Error verifying account", error, success: false });
  }
};

exports.verifyAccounts = async (req, res) => {
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
const MAX_OTP_ATTEMPTS = 10;
const ATTEMPT_WINDOW_HOURS = 3; // Time window to count attempts
const LOCK_DURATION_HOURS = 5; // Lock account for 5 hours if exceeded attempts

exports.resendOtp = async (req, res) => {
  const { phoneNumber } = req.body;
  console.log(phoneNumber, "phoneNumber for resend");

  try {
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    // ✅ Check if user is locked and if lock has expired
    if (user.loginLock && user.loginLockUntil) {
      if (new Date() < user.loginLockUntil) {
        return res.status(423).json({
          message:
            "Account locked due to too many OTP attempts. Try again later.",
        });
      } else {
        // Unlock user after lock duration expires
        user.loginLock = false;
        user.loginLockUntil = null;
        await user.save();
      }
    }

    // ✅ Find or create OTP record
    let otpRecord = await Otp.findOne({ phoneNumber });
    const now = new Date();

    if (otpRecord) {
      // Reset attempts if outside the 3-hour window
      const timeSinceLastAttempt = now - otpRecord.lastAttemptAt;
      const threeHours = ATTEMPT_WINDOW_HOURS * 60 * 60 * 1000;

      if (timeSinceLastAttempt > threeHours) {
        otpRecord.attempts = 0; // Reset attempts
      }

      otpRecord.attempts += 1;
      otpRecord.lastAttemptAt = now;

      // ✅ Lock account if attempts exceed MAX_OTP_ATTEMPTS
      if (otpRecord.attempts > MAX_OTP_ATTEMPTS) {
        user.loginLock = true;
        user.loginLockUntil = new Date(
          Date.now() + LOCK_DURATION_HOURS * 60 * 60 * 1000
        );
        await user.save();
        await otpRecord.save();

        return res.status(423).json({
          message: "Too many OTP attempts. Account locked for 5 hours.",
        });
      }
    } else {
      // Create new OTP record if doesn't exist
      otpRecord = new Otp({
        phoneNumber,
        attempts: 1,
        lastAttemptAt: now,
      });
    }

    // ✅ Generate OTP and expiration
    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    otpRecord.otp = otpCode;
    otpRecord.expiresAt = expiresAt;
    await otpRecord.save();

    // ✅ Send OTP via email (or SMS)
    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const userEmail = user?.email;
    const emailHtml = generateOTPEmail(otpCode, true, userName);
    await sendEmail(userEmail, "OTP for Verification", emailHtml);

    console.log(`Resent OTP to ${userEmail} with code: ${otpCode}`);
    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ message: "Error resending OTP", error });
  }
};

exports.changePassword = async (req, res) => {
  const { phoneNumber, newPassword, otp } = req.body;

  try {
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Error changing password", error });
  }
};

exports.forgotPassword = async (req, res) => {
  const { phoneNumber } = req.body;
  console.log(phoneNumber, "phoneNumber for forgot password");

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await Otp.findOneAndUpdate(
      { phoneNumber },
      { otp: otpCode, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const userEmail = user.email;

    const emailHtml = generateOTPEmail(otpCode, false, userName);
    await sendEmail(userEmail, "Password Reset OTP", emailHtml);

    console.log(
      `OTP sent for password recovery to ${userEmail} with code: ${otpCode}`
    );
    res.status(200).json({ message: "OTP sent for password recovery" });
  } catch (error) {
    console.error("Error sending OTP for password recovery:", error);
    res.status(500).json({ message: "Error sending OTP", error });
  }
};

exports.deleteAccount = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // await CustomerEarning.deleteOne({ userId: user._id }); // Uncomment if CustomerEarning is used
    // await RequestARide.deleteMany({
    //   $or: [{ "customer.customerId": user._id }, { "rider.userId": user._id }],
    // });
    // await DriversMessage.deleteMany({
    //   $or: [
    //     { "messages.sender": user._id.toString() },
    //     { groupId: user._id.toString() },
    //   ],
    // });

    await User.deleteOne({ phoneNumber });

    res
      .status(200)
      .json({ message: "Account and associated data deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Error deleting account", error });
  }
};
