const cron = require("node-cron");
const User = require("../models/User");

/**
 * cron/removeUnverifiedUsers.js
 *
 * This file defines a scheduled task using the `node-cron` library to remove
 * unverified users from the database after 7 days.
 *
 * - The job runs daily at midnight (00:00) using cron scheduling.
 * - It checks for users who have not verified their accounts and whose
 *   accounts were created more than 7 days ago.
 * - If found, these users are deleted from the database.
 */

// Cron job to remove unverified users after 7 days
const removeUnverifiedUsers = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Find and delete unverified users created more than 7 days ago
      await User.deleteMany({
        verified: false,
        createdAt: { $lt: sevenDaysAgo },
      });

      console.log("Unverified users removed");
    } catch (error) {
      console.error("Error removing unverified users:", error.message);
    }
  });
};

module.exports = removeUnverifiedUsers;
