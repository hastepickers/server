const otpGenerator = require("otp-generator");
const jwt = require("jsonwebtoken");
const User = require("../../models/Customer/User");
const Otp = require("../../models/Customer/Otp");
const generateTokens = require("../../utils/generateTokens");
const { sendEmail } = require("../../utils/emailUtils");
const generateOTPEmail = require("../../emails/emailTemplates/generateOTPEmail");
const MessageSupport = require("../../models/Customer/MessageSupport"); // Assuming this model exists
const { sendSMS } = require("../../utils/sendSMS");
const { sendWhatsApp } = require("../../utils/sendWhatsApp");
//const CustomerEarning = require("../../models/Customer/CustomerEarnings"); // Uncomment if CustomerEarning is used

const generateOtp = (length) => {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

const formatPhoneForSMS = (countryCode, phoneNumber) => {
  const code = countryCode.replace("+", "");
  const phone = phoneNumber.startsWith("0")
    ? phoneNumber.substring(1)
    : phoneNumber;
  return `${code}${phone}`;
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
  console.log("--- INCOMING REQUEST: CREATE ACCOUNT ---");
  console.log("Request Body:", req.body);

  let { firstName, email, referralCode, lastName, phoneNumber, countryCode } =
    req.body;

  try {
    firstName = firstName.toLowerCase();
    lastName = lastName.toLowerCase();
    email = email.toLowerCase();

    console.log(`Checking if user exists with phone: ${phoneNumber}`);
    const existingUser = await User.findOne({ phoneNumber });

    if (existingUser) {
      console.warn(`User conflict: ${phoneNumber} already exists.`);
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

    console.log("Attempting to save user to MongoDB...");
    await user.save();
    console.log("User successfully saved with ID:", user._id);

    // --- 🛡️ OTP REFRESH LOGIC START ---
    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    console.log(`Checking for existing OTP records for ${phoneNumber}...`);
    // Delete any old OTP records for this number before creating a new one
    await Otp.deleteMany({ phoneNumber });
    console.log(`🗑️ Previous OTP records cleared for ${phoneNumber}`);

    const otpRecord = new Otp({ phoneNumber, otp: otpCode, expiresAt });
    await otpRecord.save();
    console.log(`✅ New OTP record [${otpCode}] saved to database.`);
    // --- 🛡️ OTP REFRESH LOGIC END ---

    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const userEmail = user.email;

    // Trigger Notifications
    const formattedPhone = formatPhoneForSMS(countryCode, phoneNumber);
    const smsMessage = `Your Pickars verification code is: ${otpCode}. Valid for 30 mins.`;

    // Send SMS (Termii)
    try {
      await sendSMS(formattedPhone, smsMessage);
      console.log("📲 SMS sent successfully.");
    } catch (smsErr) {
      console.error("⚠️ SMS failed:", smsErr.message);
    }

    try {
      const waMsg = `Hi, ${userName} Welcome to Pickars! Your verification code is: ${otpCode}`;
      await sendWhatsApp(phoneNumber, waMsg);
    } catch (waErr) {
      console.error("WhatsApp failed:", waErr.message);
    }

    // Send Email (Zoho)
    try {
      const emailHtml = generateOTPEmail(otpCode, false, userName);
      await sendEmail(userEmail, "Verify Your Account", emailHtml);
      console.log("📧 Email sent successfully.");
    } catch (emailErr) {
      console.error("⚠️ Email failed:", emailErr.message);
    }

    console.log(`✨ SUCCESS: Account created for ${userEmail}.`);

    res.status(201).json({
      message: "Account created successfully, OTP sent for verification",
    });
  } catch (error) {
    console.error("--- CRITICAL ERROR IN CREATE ACCOUNT ---");
    console.error("Error Message:", error.message);

    res
      .status(500)
      .json({ message: "Error creating account", error: error.message });
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
  console.log("📌 Login attempt (No Lock) for phoneNumber:", phoneNumber);

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      console.log("❌ User not found");
      return res.status(400).json({ message: "User not found" });
    }

    console.log("✅ User found:", user.email);

    const currentTime = new Date();
    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min OTP expiry

    console.log("🔑 Generated OTP:", otpCode);

    // Update or Create OTP record without blocking/locking
    let otpRecord = await Otp.findOne({ phoneNumber });

    if (otpRecord) {
      otpRecord.otp = otpCode;
      otpRecord.expiresAt = expiresAt;
      otpRecord.attempts += 1; // Keeping count for analytics, but not blocking
      otpRecord.lastAttemptAt = currentTime;
      await otpRecord.save();
      console.log("✅ OTP record updated");
    } else {
      otpRecord = new Otp({
        phoneNumber,
        otp: otpCode,
        expiresAt,
        attempts: 1,
        lastAttemptAt: currentTime,
      });
      await otpRecord.save();
      console.log("✅ New OTP record created");
    }

    // --- TRIGGER NOTIFICATIONS ---

    // 1. Email via Zoho
    const emailHtml = generateOTPEmail(
      otpCode,
      false,
      `${user.firstName} ${user.lastName}`
    );
    await sendEmail(user.email, "OTP for Verification", emailHtml);
    console.log(`📧 OTP email sent to ${user.email}`);

    // 2. SMS via Termii
    try {
      const formattedPhone = formatPhoneForSMS(
        user.countryCode || "234",
        phoneNumber
      );
      await sendSMS(formattedPhone, `Your Pickars login code is: ${otpCode}`);
    } catch (smsError) {
      console.error(
        "⚠️ SMS failed to send, but proceeding with Email:",
        smsError.message
      );
    }
    try {
      const waMsg = `Your Pickars login code is: ${otpCode}`;
      await sendWhatsApp(phoneNumber, waMsg);
    } catch (waErr) {
      console.error("WhatsApp login failed:", waErr.message);
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully for login",
    });
  } catch (error) {
    console.error("❌ Error logging in:", error);
    res.status(500).json({ message: "Error logging in", error: error.message });
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
  console.log(`\n--- 🛡️ VERIFY ACCOUNT START ---`);
  console.log(`📱 Phone: ${phoneNumber} | 🔑 OTP: ${otp}`);

  try {
    // 🛠️ 1. Check for Hardcoded Test Bypass
    if (phoneNumber === "8120710198" && otp === "123456") {
      console.log("⚠️  Bypass: Using hardcoded test credentials.");
      let user = await User.findOne({ phoneNumber });

      if (!user) {
        console.log(
          "❌ Bypass failed: Phone matches but User not found in DB."
        );
        return res
          .status(404)
          .json({ message: "User not found", success: false });
      }

      if (!user.verified) {
        console.log(`✅ Bypass: Marking user ${user.email} as verified.`);
        user.verified = true;
        await user.save();
        await createMessageSupportIfNotExists(user._id);
      } else {
        console.log(`ℹ️  Bypass: User ${user.email} was already verified.`);
      }

      const { accessToken, refreshToken } = generateTokens(user._id);
      console.log(`✨ Bypass success: Tokens generated for ${user._id}`);

      return res.status(200).json({
        message: "Account verified successfully (hardcoded route)",
        success: true,
        accessToken,
        refreshToken,
        user,
      });
    }

    // 🔒 2. Default Verification Flow
    console.log("🔍 Default flow: Checking OTP record in database...");
    const otpRecord = await Otp.findOne({ phoneNumber });

    if (!otpRecord) {
      console.log(`❌ Failed: No OTP record found for ${phoneNumber}`);
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    if (otpRecord.otp !== otp) {
      console.log(
        `❌ Failed: OTP Mismatch. DB expected [${otpRecord.otp}], User sent [${otp}]`
      );
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    console.log("✅ OTP Matched. Finding User record...");
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      console.log(
        `❌ Failed: OTP valid but User ${phoneNumber} does not exist.`
      );
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // 3. Handle Already Verified Case
    if (user.verified) {
      console.log(
        `ℹ️  User ${user.email} is already verified. Reissuing tokens.`
      );
      const { accessToken, refreshToken } = generateTokens(user._id);
      return res.status(200).json({
        message: "Account is already verified",
        success: true,
        accessToken,
        refreshToken,
        user,
      });
    }

    // 4. Finalize Verification
    console.log(`🔄 Finalizing: Setting verified to true and cleaning up OTP.`);
    user.verified = true;
    await user.save();

    await Otp.deleteOne({ phoneNumber });
    console.log(`🗑️  OTP record deleted for ${phoneNumber}`);

    await createMessageSupportIfNotExists(user._id);
    console.log(`💬 Support chat check completed.`);

    const { accessToken, refreshToken } = generateTokens(user._id);
    console.log(`🏁 Success: Account verification finished for ${user.email}`);

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

  console.log("--------------------------------------------------");
  console.log(`🔄 [resendOtp] START: Request for ${phoneNumber}`);

  try {
    // 1. Find User
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      console.warn(`❌ [resendOtp] User not found: ${phoneNumber}`);
      return res.status(404).json({ message: "User does not exist" });
    }

    console.log(
      `👤 [resendOtp] User found: ${user.firstName} ${user.lastName}`
    );

    // 2. Check Security Locks
    if (user.loginLock && user.loginLockUntil) {
      if (new Date() < user.loginLockUntil) {
        console.warn(
          `🔒 [resendOtp] Account LOCKED until: ${user.loginLockUntil}`
        );
        return res.status(423).json({
          message:
            "Account locked due to too many OTP attempts. Try again later.",
        });
      } else {
        console.log("🔓 [resendOtp] Lock expired. Resetting user lock status.");
        user.loginLock = false;
        user.loginLockUntil = null;
        await user.save();
      }
    }

    // 3. Rate Limiting & Attempt Tracking
    let otpRecord = await Otp.findOne({ phoneNumber });
    const now = new Date();

    if (otpRecord) {
      const timeSinceLast = now - otpRecord.lastAttemptAt;
      const windowMs = ATTEMPT_WINDOW_HOURS * 60 * 60 * 1000;

      if (timeSinceLast > windowMs) {
        console.log(
          `🕒 [resendOtp] Window reset (> ${ATTEMPT_WINDOW_HOURS}h). Clearing attempts.`
        );
        otpRecord.attempts = 0;
      }

      otpRecord.attempts += 1;
      otpRecord.lastAttemptAt = now;
      console.log(
        `📊 [resendOtp] Attempt count: ${otpRecord.attempts}/${MAX_OTP_ATTEMPTS}`
      );

      if (otpRecord.attempts > MAX_OTP_ATTEMPTS) {
        console.error("🚫 [resendOtp] MAX ATTEMPTS REACHED. Locking user.");
        user.loginLock = true;
        user.loginLockUntil = new Date(
          Date.now() + LOCK_DURATION_HOURS * 60 * 60 * 1000
        );
        await user.save();
        await otpRecord.save();
        return res
          .status(423)
          .json({ message: "Too many attempts. Locked for 5 hours." });
      }
    } else {
      console.log("🆕 [resendOtp] Creating fresh OTP record.");
      otpRecord = new Otp({ phoneNumber, attempts: 1, lastAttemptAt: now });
    }

    // 4. Generate & Save OTP
    const otpCode = generateOtp(6);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    otpRecord.otp = otpCode;
    otpRecord.expiresAt = expiresAt;
    await otpRecord.save();

    console.log(`🎫 [resendOtp] OTP Saved: ${otpCode}`);

    // 5. Send Email (Awaited to ensure SMTP connection)
    const emailHtml = generateOTPEmail(otpCode, true, user.firstName);
    await sendEmail(user.email, "Your Pickars OTP", emailHtml);
    console.log(`📧 [resendOtp] Email sent to ${user.email}`);

    // 6. 🛡️ FAIL-SAFE WHATSAPP (Non-blocking IIFE)
    (async () => {
      try {
        console.log(`📡 [Background-WA] Sending to ${phoneNumber}...`);
        await sendWhatsApp(
          phoneNumber,
          `Your new Pickars code is: ${otpCode}. Valid for 30 mins. 🚗`
        );
        console.log(`✅ [Background-WA] Delivered to ${phoneNumber}`);
      } catch (waErr) {
        console.error(`⚠️ [Background-WA] Failed: ${waErr.message}`);
        // Logic remains safe; user already has their response
      }
    })();

    console.log(`✨ [resendOtp] COMPLETED SUCCESSFULLY for ${phoneNumber}`);
    console.log("--------------------------------------------------");

    return res.status(200).json({
      message: "OTP resent successfully",
      success: true,
    });
  } catch (error) {
    console.error("🔥 [resendOtp] CRITICAL SYSTEM ERROR:", error);
    return res.status(500).json({
      message: "Error resending OTP",
      error: error.message,
    });
  }
};

// exports.resendOtp = async (req, res) => {
//   const { phoneNumber } = req.body;
//   const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
//   const MAX_ATTEMPTS = 5;

//   try {
//     const user = await User.findOne({ phoneNumber });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const now = new Date();
//     let otpRecord = await Otp.findOne({ phoneNumber });

//     if (otpRecord) {
//       const timeDiff = now - new Date(otpRecord.lastAttemptAt);

//       // Check if we are still within the 3-hour window
//       if (timeDiff < THREE_HOURS_MS) {
//         if (otpRecord.attempts >= MAX_ATTEMPTS) {
//           console.warn(`🚫 Rate limit hit for ${phoneNumber}: ${otpRecord.attempts} attempts.`);
//           return res.status(423).json({
//             success: false,
//             message: "Too many attempts. Please try again after 3 hours.",
//           });
//         }
//         // Increment attempts if within window
//         otpRecord.attempts += 1;
//       } else {
//         // Window expired, reset counter to 1
//         otpRecord.attempts = 1;
//       }

//       otpRecord.lastAttemptAt = now;
//     } else {
//       // First time requesting OTP
//       otpRecord = new Otp({
//         phoneNumber,
//         attempts: 1,
//         lastAttemptAt: now
//       });
//     }

//     const otpCode = generateOtp(6);
//     const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

//     // Save the updated record
//     otpRecord.otp = otpCode;
//     otpRecord.expiresAt = expiresAt;
//     await otpRecord.save();

//     // --- TRIGGER NOTIFICATIONS ---

//     // 1. Email
//     const emailHtml = generateOTPEmail(otpCode, true, `${user.firstName} ${user.lastName}`);
//     await sendEmail(user.email, "Resent OTP", emailHtml);

//     // 2. SMS (Termii)
//     const formattedPhone = formatPhoneForSMS(user.countryCode || "234", phoneNumber);
//     await sendSMS(formattedPhone, `Your new Pickars code is: ${otpCode}. Attempt ${otpRecord.attempts}/${MAX_ATTEMPTS}`);

//     res.status(200).json({
//       success: true,
//       message: "OTP resent via SMS and Email",
//       attemptsRemaining: MAX_ATTEMPTS - otpRecord.attempts
//     });

//   } catch (error) {
//     console.error("Error in resendOtp:", error);
//     res.status(500).json({ success: false, message: "Error resending OTP" });
//   }
// };

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

    const formattedPhone = formatPhoneForSMS(
      user.countryCode || "234",
      phoneNumber
    );
    await sendSMS(
      formattedPhone,
      `Reset your Pickars password with code: ${otpCode}`
    );

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
    await RequestARide.deleteMany({
      $or: [{ "customer.customerId": user._id }, { "rider.userId": user._id }],
    });
    await DriversMessage.deleteMany({
      $or: [
        { "messages.sender": user._id.toString() },
        { groupId: user._id.toString() },
      ],
    });

    await User.deleteOne({ phoneNumber });

    res
      .status(200)

      .json({
        message: "Account and associated data deleted successfully",
        success: true,
      });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Error deleting account", error });
  }
};
