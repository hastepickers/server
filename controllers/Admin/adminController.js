const {
  sendUniversalMessage,
} = require("../../Middlewares/sendPushNotifications");
const Admin = require("../../models/Admin/Admin");
const AdminOTP = require("../../models/Admin/AdminOTP");
const jwt = require("jsonwebtoken");
const NotificationLog = require('../../models/Admin/NotificationLog');
const { sendEmail } = require("../../utils/emailUtils");
// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_ADMIN, { expiresIn: "1d" });
};

/**
 * 1️⃣ Create Admin Account
 */
exports.createAdmin = async (req, res) => {
  try {
    const { email, firstName, lastName, role } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin)
      return res.status(400).json({ message: "Admin already exists" });

    const newAdmin = await Admin.create({ email, firstName, lastName, role });
    res.status(201).json({ message: "Admin created successfully", newAdmin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 2️⃣ Login (Request OTP)
 */
exports.loginRequest = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email, isActive: true });

    if (!admin) {
      return res.status(404).json({ message: "Admin account not found" });
    }

    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Save OTP to DB
    await AdminOTP.create({ adminEmail: email, otp });

    // 3. Prepare Professional Email Content
    const subject = `🔐 ${otp} is your Pickars Admin Access Code`;
    const text = `Your Pickars Admin verification code is: ${otp}. This code expires in 10 minutes.`;
    
    // Premium Dark-themed HTML Template
    const html = `
      <div style="font-family: sans-serif; background-color: #050505; color: #ffffff; padding: 40px; border-radius: 24px; max-width: 500px; margin: auto; border: 1px solid #1a1a1a;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="letter-spacing: -2px; font-weight: 900; font-size: 28px; margin: 0;">PICKARS<span style="color: #ef4444;">.</span></h1>
          <p style="font-size: 10px; tracking: 0.2em; color: #666; text-transform: uppercase; margin-top: 5px;">Neural Admin Gateway</p>
        </div>
        
        <div style="background-color: #0a0a0a; border: 1px solid #ffffff10; padding: 30px; border-radius: 20px; text-align: center;">
          <p style="color: #999; font-size: 14px; margin-bottom: 10px;">Verification Code</p>
          <h2 style="font-size: 42px; letter-spacing: 10px; color: #ffffff; margin: 0; font-family: monospace;">${otp}</h2>
        </div>

        <p style="font-size: 12px; color: #555; text-align: center; margin-top: 30px; line-height: 1.6;">
          If you didn't request this, please ignore this email. <br/>
          Secure session initialized for <b>${email}</b>.
        </p>
      </div>
    `;

    // 4. Fire the Email
    await sendEmail(email, subject, text, html);

    // --- LOG FOR POSTMAN TESTING ---
    console.log("------------------------------------------");
    console.log(`🚀 PICKARS ADMIN LOGIN: OTP SENT`);
    console.log(`📧 To: ${email} | 🔑 OTP: ${otp}`);
    console.log("------------------------------------------");

    res.status(200).json({
      success: true,
      message: "Security code dispatched to your inbox.",
      email,
    });
  } catch (error) {
    console.error("🔥 Login Request Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to dispatch security code." });
  }
};
/**
 * 3️⃣ Verify OTP & Generate Token
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const validOtp = await AdminOTP.findOne({ adminEmail: email, otp });

    if (!validOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const admin = await Admin.findOne({ email });

    // Update last login
    admin.lastLogin = Date.now();
    await admin.save();

    // Generate Access Token
    const token = generateToken(admin._id);

    // Delete OTP after successful use
    await AdminOTP.deleteMany({ adminEmail: email });

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        name: `${admin.firstName} ${admin.lastName}`,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 4️⃣ Get All Admins
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminPushController = async (req, res) => {
  const { userId, title, message, sendToAll } = req.body;
  
  // ✅ Check both ._id and .id to be safe
  const adminId = req.admin?._id || req.admin?.id;

  // 🛡️ Safety Guard: Stop if no admin is detected
  if (!adminId) {
    console.error("🛑 AUTH ERROR: adminId is missing. Check if protectAdmin middleware is applied.");
    return res.status(401).json({ message: "Admin authentication required to log notifications." });
  }

  try {
    console.log(`📣 Admin Push Triggered: ${sendToAll ? "BROADCAST" : "SINGLE USER"}`);

    const target = sendToAll ? null : userId;

    if (!target && !sendToAll) {
      return res.status(400).json({ message: "Please provide a userId or set sendToAll to true." });
    }

    // 1. Send the Notification
    const result = await sendUniversalMessage(target, title, message, {
      type: sendToAll ? "MARKETING_BROADCAST" : "USER_ALERT",
      sent_at: new Date().toISOString(),
      app: "Pickars",
    });

    // 2. Log the notification
    await NotificationLog.create({
      adminId, // Now guaranteed to be present or the code would have exited above
      title,
      message,
      targetType: sendToAll ? "BROADCAST" : "SINGLE_USER",
      targetUserId: sendToAll ? null : userId,
      deliveryStats: {
        totalDevices: result.totalDevices || 0,
        iosCount: result.iosCount || 0,
        androidCount: result.androidCount || 0,
      },
      payload: { app: "Pickars", type: sendToAll ? "BROADCAST" : "ALERT" },
    });

    res.status(200).json({
      message: sendToAll ? "Broadcast sent and logged" : "Notification sent and logged",
      details: result,
    });
  } catch (err) {
    console.error("🔥 Admin Push Controller Error:", err.message);
    res.status(500).json({ error: "Internal server error while sending notifications." });
  }
};

/**
 * 📜 Get Notification History
 */
exports.getNotificationHistory = async (req, res) => {
  try {
    const history = await NotificationLog.find()
      .populate("adminId", "firstName lastName email")
      .populate("targetUserId", "firstName lastName phoneNumber")
      .sort({ createdAt: -1 });

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
