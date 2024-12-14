const jwt = require("jsonwebtoken");

// Utility function to decode rider's token from request headers
const decodeRiderToken = (req) => {
  try {
    const token = req.headers.authorization.split(" ")[1]; // Assumes token is passed as "Bearer <token>"
    if (!token) {
      return null;
    }

    // Decode and verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // Returns the decoded payload, typically { phoneNumber, iat, exp }
  } catch (error) {
    console.error("Error decoding token:", error.message);
    return null;
  }
};

module.exports = decodeRiderToken;