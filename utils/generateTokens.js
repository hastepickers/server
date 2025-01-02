/**
 * utils/generateTokens.js
 *
 * This file contains utility functions to generate JSON Web Tokens (JWT)
 * for user authentication, including access and refresh tokens.
 */

const jwt = require("jsonwebtoken");

// Function to generate access and refresh tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "120d",
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "120d",
  });

  return { accessToken, refreshToken };
};

module.exports = generateTokens;
