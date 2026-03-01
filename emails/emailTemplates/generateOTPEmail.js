const generateOTPEmail = (
  otpCode,
  isResend = false,
  userName = "Valued Customer"
) => {
  if (!otpCode) {
    console.error("OTP code is missing");
    return null;
  }

  const headerText = isResend ? "Your New OTP" : "Verify Your Account";
  const bodyIntro = isResend
    ? `We've received a request to resend your One-Time Password.`
    : `Thank you for registering with us! To complete your verification, please use the One-Time Password (OTP) below.`;
  const instruction = `This code is valid for 30 minutes. Please do not share it with anyone.`;

  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f7f7f7;
            margin: 0;
            padding: 20px;
            color: #555555;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            border: 1px solid #e0e0e0;
            overflow: hidden;
          }
          /* Text-based Logo Replacement */
          .logo-box {
            padding: 25px 20px;
            font-size: 24px;
            font-weight: 900;
            color: #cc0000; /* Pickars Red */
            letter-spacing: -1px;
          }
          .header-banner {
            background-color: #1a1a1a; /* Dark sleek background instead of image */
            margin: 0 20px;
            border-radius: 12px;
            padding: 40px 20px;
            text-align: center;
          }
          .otp-code {
            font-size: 42px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #ffffff;
            margin: 0;
          }
          .content-area {
            padding: 10px 20px;
          }
          .title-text {
            font-size: 20px;
            font-weight: 700;
            color: #333333;
            margin-bottom: 15px;
          }
          .paragraph {
            font-size: 16px;
            line-height: 1.6;
            margin: 15px 0;
          }
          .instruction-box {
            background-color: #fff4f4;
            border-left: 4px solid #cc0000;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
            font-style: italic;
          }
          .footer {
            padding: 20px;
            border-top: 1px solid #eeeeee;
            font-size: 13px;
            color: #888888;
          }
          .footer-link {
            color: #cc0000;
            text-decoration: none;
            font-weight: bold;
          }
          .social-links {
             margin-top: 15px;
             font-weight: bold;
             color: #555555;
          }
        </style>
        </head>
        <body>
        <div class="container">
          <div class="logo-box">
            PICKARS
          </div>
    
          <div class="content-area">
            <p class="paragraph">Hi <strong>${userName}</strong>,</p>
            <div class="title-text">${headerText}</div>
            
            <p class="paragraph">${bodyIntro}</p>
            
            <p class="paragraph" style="text-align: center; font-weight: bold; margin-top: 30px;">Your One-Time Password is:</p>
          </div>

          <div class="header-banner">
            <div class="otp-code">${otpCode}</div>
          </div>

          <div class="content-area">
            <div class="instruction-box">
              ${instruction}
            </div>
            
            <p class="paragraph">If you did not request this OTP, please ignore this email or contact our support team immediately.</p>
          </div>
    
          <div class="footer">
            <p>The Pickars Team</p>
            <p>Got any issues? Email us at <a href="mailto:support@pickars.com" class="footer-link">support@pickars.com</a></p>
            <div class="social-links">
              INSTAGRAM | FACEBOOK | TIKTOK | TWITTER
            </div>
          </div>
        </div>
        </body>
        </html>
        `;
};

module.exports = generateOTPEmail;
