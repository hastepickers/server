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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <style>
          body {
            font-family: "DM Sans", Arial, sans-serif;
            background-color: #f7f7f7;
            margin: 0;
            padding: 20px;
            text-align: left;
            width: 100%;
            color: #555555; /* All fonts in gray */
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            padding: 0;
            border: 0.5px #66666666 solid;
            text-align: left;
            overflow: hidden;
            text-decoration: none;
          }
          .header-logo {
            width: 48px;
            margin: 20px;
          }
          .header-banner {
            background: url("https://res.cloudinary.com/daiiiiupy/image/upload/v1752742519/clcard_lzlr0s.png")
              no-repeat center center;
            background-size: cover;
            height: 96px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #fff; /* Keep white for contrast on dark banner */
            position: relative;
            margin: 12px 20px;
            border-radius: 12px;
          }
          .header-text {
            padding: 31px 20px;
            border-radius: 6px;
            font-size: 24px;
            font-weight: 700;
            color: #ffffff; /* Keep white for contrast on dark banner */
            max-width: 100%;
            text-align: center;
          }
          .title {
            color: #555555; /* Changed from red to gray */
            font-size: 24px;
            font-weight: 700;
            margin: 20px;
          }
          .paragraph {
            font-size: 16px;
            color: #555555; /* Ensure all paragraphs are gray */
            line-height: 1.6;
            margin: 12px 20px;
            text-decoration: none;
          }
          .paragraph-bold {
            font-weight: 900;
            text-decoration: none;
          }
          .social-icons-container {
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: center;
            margin: 10px 20px;
            width: 100%;
          }
          .social-icon {
            width: 24px;
            height: 24px;
            margin-right: 24px;
          }
          .footer {
            font-size: 14px;
            color: #555555; /* Changed to gray */
            margin: 20px;
          }
          .footer-link {
            color: #555555; /* Changed from red to gray */
            text-decoration: none;
          }
          .otp-code {
            font-size: 36px; /* Larger font size for OTP */
            font-weight: 700;
            letter-spacing: 4px; /* Space out the digits */
            color: #ffffff;
          }
        </style>
        </head>
        <body>
        <div class="container">
          <img src="https://res.cloudinary.com/daiiiiupy/image/upload/v1752741191/mainLogo_kurdtf.png"
                alt="Pickars Logo" class="header-logo" />
    
          <p class="paragraph">Hi ${userName},</p>
          <p class="paragraph paragraph-bold">${headerText}</p>
          
          <p class="paragraph">${bodyIntro}</p>
          <br />
          
          <p class="paragraph paragraph-bold">Your One-Time Password is:</p>
          <div class="header-banner">
            <div class="header-text otp-code">${otpCode}</div>
          </div>
          <p class="paragraph">**${instruction}**</p>
          
          <br />
    
          <p class="paragraph">If you did not request this OTP, please ignore this email or contact our support team immediately.</p>
    
          <br />
          <div class="social-icons-container">
            <a href="https://instagram.com/pickars"><img src="https://img.icons8.com/ios/24/666666/instagram-new.png" alt="Instagram" class="social-icon"/></a>
            <a href="https://facebook.com/pickars"><img src="https://img.icons8.com/ios/24/666666/facebook-new.png" alt="Facebook" class="social-icon"/></a>
            <a href="https://tiktok.com/@pickars"><img src="https://img.icons8.com/ios/24/666666/tiktok.png" alt="TikTok" class="social-icon"/></a>
            <a href="https://twitter.com/pickars"><img src="https://img.icons8.com/ios/24/666666/twitter.png" alt="Twitter" class="social-icon"/></a>
          </div>
          <br />
    
          <p class="footer">The Pickars Team</p>
          <p class="footer">
            Got any Issues? Email us at
            <a
              href="mailto:support@pickars.com"
              class="footer-link"
              >support@pickars.com</a
            >
          </p>
        </div>
        </body>
        </html>
        `;
};

module.exports = generateOTPEmail;
