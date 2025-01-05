const jwt = require("jsonwebtoken");

// Secret keys
const COMPANY_SECRET = "yourCompanySecretKey";
const RIDER_SECRET = "yourRiderSecretKey";

// Generate company token
exports.generateCompanyToken = (companyId) => {
  const accessToken = jwt.sign({ companyId }, COMPANY_SECRET, {
    expiresIn: "400d",
  });
  const refreshToken = jwt.sign({ companyId }, COMPANY_SECRET, {
    expiresIn: "400d",
  });
  return { accessToken, refreshToken };
};

// Generate rider token
exports.generateRiderToken = (riderId) => {
  const accessToken = jwt.sign({ riderId }, RIDER_SECRET, {
    expiresIn: "400d",
  });
  const refreshToken = jwt.sign({ riderId }, RIDER_SECRET, {
    expiresIn: "400d",
  });
  return { accessToken, refreshToken };
};

// Verify company token
exports.verifyCompanyToken = (token) => jwt.verify(token, COMPANY_SECRET);

// Verify rider token
exports.verifyRiderToken = (token) => jwt.verify(token, RIDER_SECRET);

// Middleware to verify the rider token in requests
exports.verifyRiderTokenMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header

  if (!token || typeof token !== "string") {
    return res
      .status(403)
      .json({ message: "No token provided or invalid token" });
  }

  try {
    const decoded = exports.verifyRiderToken(token); // Verify token using the helper function
    req.riderId = decoded.riderId; // Attach riderId to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Invalid or expired token", error: error.message });
  }
};
