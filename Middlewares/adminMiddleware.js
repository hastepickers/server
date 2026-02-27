const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin/Admin");

/**
 * 🔐 Protect Admin Routes
 */
exports.protectAdmin = async (req, res, next) => {
  let token;

  console.log("------------------------------------------");
  console.log("🛡️ [AUTH] Admin Protection Middleware Triggered");

  // 1. Check if token exists in Headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log(`🎫 [TOKEN] Found: ${token.substring(0, 15)}...`);

      // 2. Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);
      console.log("✅ [DECODED] JWT Payload:", JSON.stringify(decoded, null, 2));

      // 3. Find Admin
      req.admin = await Admin.findById(decoded.id).select("-__v");

      if (!req.admin) {
        console.warn("❌ [NOT FOUND] No admin matches ID in database.");
        return res
          .status(401)
          .json({ message: "Not authorized, admin not found" });
      }

      console.log(`👤 [PROFILE] Admin identified: ${req.admin.email} (${req.admin.role})`);

      // 4. Check if Admin is active
      if (!req.admin.isActive) {
        console.warn(`🚫 [DEACTIVATED] Access denied for account: ${req.admin.email}`);
        return res
          .status(403)
          .json({ message: "Admin account is deactivated" });
      }

      console.log("🚀 [SUCCESS] Middleware passing to next controller");
      console.log("------------------------------------------");
      next();
    } catch (error) {
      console.error("🔥 [AUTH ERROR]:", error.message);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    console.error("🛑 [NO TOKEN] Request blocked: Missing Authorization Header");
    res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

/**
 * 👑 Role Authorization
 */
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log(`⚖️ [ROLE CHECK] Allowed: [${roles}] | Requester: ${req.admin?.role}`);
    
    if (!roles.includes(req.admin.role)) {
      console.warn(`🚫 [PERMISSION DENIED] ${req.admin.email} lacks required role.`);
      return res.status(403).json({
        message: `Role (${req.admin.role}) is not authorized to access this resource`,
      });
    }

    console.log("✅ [PERMISSION GRANTED]");
    next();
  };
};