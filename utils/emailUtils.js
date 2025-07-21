const nodemailer = require("nodemailer");
require("dotenv").config();

const senderEmail = 'support@pickars.com'
// ✅ Create Zoho transporter
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465, // SSL port
  secure: true, // true for port 465
  auth: {
    user: process.env.ZOHO_USER, // SUPPORT@PICKARS.COM
    pass: process.env.ZOHO_PASS, // Your password
  },
});

/**
 * Send Email via Zoho SMTP
 * @param {string|string[]} recipients - Single email or array of emails
 * @param {string} subject - Email subject
 * @param {string} text - Plain text version
 * @param {string} [html] - Optional HTML version
 */
async function sendEmail(recipients, subject, text, html = null) {
  try {
    // ✅ Ensure recipients is an array
    const to = Array.isArray(recipients) ? recipients.join(", ") : recipients;

    const mailOptions = {
      from: `"Team Pickars" <${senderEmail}>`, // ✅ Sender name & email
      to,
      subject,
      text,
      html: html || text,
      headers: {
        "Reply-To": "support@pickars.com", // ✅ Prevent replies
        "X-Auto-Response-Suppress": "All",  // ✅ Blocks auto-replies
        "Auto-Submitted": "auto-generated", // ✅ Marks email as system-generated
      },
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to: ${to}`);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw error;
  }
}

module.exports = { sendEmail };