function generateEmailTemplate({
  title,
  header,
  text1 = "",
  text2 = "",
  text3 = "",
  text4 = "",
  text5 = "",
  footer = "",
  buttonText,
  buttonLink,
  logoUrl = "https://res.cloudinary.com/daiiiiupy/image/upload/v1752741191/mainLogo_kurdtf.png",
}) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'DM Sans', Arial, sans-serif;
          background-color: #f7f7f7;
          margin: 0;
          padding: 20px;
          text-align: left; /* ✅ Align everything left */
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          padding: 16px;
          border: 0.5px #66666666 solid;
          text-align: left; /* ✅ Keep content left aligned */
        }
        .title {
          color: #ff0000; /* ✅ Primary Color */
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .header {
          font-size: 20px;
          color: #333;
          margin-bottom: 15px;
          font-weight: 500;
        }
        .paragraph {
          font-size: 16px;
          color: #555555;
          line-height: 1.6;
          margin-bottom: 12px;
        }
        .cta-button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #ff0000; /* ✅ Button color */
          color: #ffffff;
          text-decoration: none;
          font-weight: bold;
          border-radius: 6px;
          font-size: 16px;
          margin-top: 20px;
        }
        .footer {
          font-size: 14px;
          color: #999999;
          margin-top: 30px;
        }
        .social-icons img {
          width: 28px;
          margin-right: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; width:'100%">
      <!-- Logo -->
      <img src="${logoUrl}" alt="Pickars Logo" style="width: 48px;" />
    
      <!-- Social Icons -->
      <div class="social-icons" style="display: flex; gap: 15px; align-items: center;">
      <a href="https://instagram.com/pickars">
        <img src="https://img.icons8.com/ios/32/666666/instagram-new.png" alt="Instagram" style="display:block;" />
      </a>
      <a href="https://facebook.com/pickars">
        <img src="https://img.icons8.com/ios/32/666666/facebook-new.png" alt="Facebook" style="display:block;" />
      </a>
      <a href="https://tiktok.com/@pickars">
        <img src="https://img.icons8.com/ios/32/666666/tiktok.png" alt="TikTok" style="display:block;" />
      </a>
      <a href="https://twitter.com/pickars">
        <img src="https://img.icons8.com/ios/32/666666/twitter.png" alt="Twitter" style="display:block;" />
      </a>
    </div>
    </div>



        <h1 class="title">${title}</h1>
        ${header ? `<h2 class="header">${header}</h2>` : ""}
        
        ${text1 ? `<p class="paragraph">${text1}</p>` : ""}
        ${text2 ? `<p class="paragraph">${text2}</p>` : ""}
        ${text3 ? `<p class="paragraph">${text3}</p>` : ""}
        ${text4 ? `<p class="paragraph">${text4}</p>` : ""}
        ${text5 ? `<p class="paragraph">${text5}</p>` : ""}
        
        ${
          buttonText && buttonLink
            ? `<a href="${buttonLink}" class="cta-button">${buttonText}</a>`
            : ""
        }
        
        ${footer ? `<p class="footer">${footer}</p>` : ""}

        <p class="footer">
          Got any Issues? Email us at 
          <a href="mailto:support@pickars.com" style="color:#ff0000; text-decoration:none;">support@pickars.com</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

module.exports = { generateEmailTemplate };
