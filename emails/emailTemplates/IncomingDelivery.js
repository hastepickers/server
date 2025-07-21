// utils/emailTemplates/deliveryNotification.js

/**
 * Generates the HTML content for an incoming delivery notification email.
 *
 * @param {object} ride - The ride object from your Mongoose RequestARide model.
 * @param {string} userId - The ID of the receiving user (to match against receiverUserId in deliveryDropoff).
 * @returns {Promise<string|null>} A Promise that resolves with the HTML string, or null if delivery details are not found.
 */
const generateIncomingDispatch = async (ride, userId) => {
    if (!ride || !userId) {
      console.error("Missing ride object or userId for email generation.");
      return null;
    }
  
    const formatName = (name) => {
      if (!name) return "";
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };
  
    const deliveryDetails = ride.deliveryDropoff.find(
      (dropoff) =>
        dropoff.receiverUserId && dropoff.receiverUserId.toString() === userId
    );
  
    if (!deliveryDetails) {
      console.error(
        `Delivery details for user ${userId} not found on ride ${ride._id}.`
      );
      return null; // Or throw an error if you prefer
    }
  
    const receiverName = formatName(deliveryDetails.receiverName);
    const deliveryAddress = deliveryDetails.deliveryAddress;
    const pickupCode = deliveryDetails.parcelId || "N/A"; // Use parcelId as pickupCode
    const senderName = ride.customer.firstName
      ? `${formatName(ride.customer.firstName)} ${formatName(
          ride.customer.lastName
        )}`
      : "A Customer";
  
    const riderFirstName = ride.rider.firstName
      ? formatName(ride.rider.firstName)
      : "Our";
    const riderLastName = ride.rider.lastName
      ? formatName(ride.rider.lastName)
      : "Rider";
    const riderFullName = `${formatName(riderFirstName)} ${formatName(
      riderLastName
    )}`;
    const riderPhoneNumber = ride.rider.phoneNumber || "N/A";
  
    const htmlContent = `
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
            width:100%
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
                    width:100%
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
            color: #fff;
            position: relative;
            margin: 12px 20px;
            border-radius: 12px;
          }
          .header-text {
            padding: 31px 20px;
            border-radius: 6px;
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
            max-width: 100%;
            text-align: center;
          }
          .title {
            color: #ff0000;
            font-size: 24px;
            font-weight: 700;
            margin: 20px;
          }
          .paragraph {
            font-size: 16px;
            color: #555555;
            line-height: 1.6;
            margin: 12px 20px;
          }
          .paragraph-bold {
              font-weight: 900;
          }
          .cta-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #ff0000;
            color: #ffffff;
            text-decoration: none;
            font-weight: bold;
            border-radius: 6px;
            font-size: 16px;
            margin: 20px;
          }
          .social-icons-container {
              display: flex;
              gap: 8px;
              align-items: center;
              justify-content: center;
              margin: 10px 20px;
              width:100%
          }
          .social-icon {
              width: 24px;
              height: 24px;
              margin-right: 24px
          }
          .driver-info-box {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-top: 20px;
              padding: 12px;
              border: 1px solid #eee;
              border-radius: 6px;
              background-color: #fafafa;
              margin: 12px 20px;
              justify-content: center;
          }
          .driver-icon {
              width: 26px;
              height: 26px;
          }
          .driver-details {
              margin-left: 16px;
          }
          .driver-name {
              font-size: 16px;
              font-weight: 600;
              color: #333;
          }
          .driver-phone {
              font-size: 14px;
              color: #555555;
              text-decoration: none;
          }
          .footer {
            font-size: 14px;
            color: #999999;
            margin: 20px;
          }
          .footer-link {
              color: #ff0000;
              text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img
            src="https://res.cloudinary.com/daiiiiupy/image/upload/v1752741191/mainLogo_kurdtf.png"
            alt="Pickars Logo"
            class="header-logo"
          />
    
          <p class="paragraph">Hi ${receiverName},</p>
    
          <p class="paragraph">
            Your delivery is on its way to you at ${deliveryAddress}, from
            ${senderName}. Our trusted rider has picked up your package and will
            ensure it gets to you safely and on time.
          </p>
    
          <p class="paragraph paragraph-bold">Your Pickup Code is</p>
    
          <div class="header-banner">
            <div class="header-text">${pickupCode}</div>
          </div>
    
          <p class="paragraph">
            Thank you for choosing Pickars for your delivery needs. We are committed
            to ensuring your experience is smooth and reliable.
          </p>
    
          <br />
          <div class="social-icons-container">
            <a href="https://instagram.com/pickars">
              <img
                src="https://img.icons8.com/ios/24/666666/instagram-new.png"
                alt="Instagram"
                class="social-icon"
              />
            </a>
            <a href="https://facebook.com/pickars">
              <img
                src="https://img.icons8.com/ios/24/666666/facebook-new.png"
                alt="Facebook"
                class="social-icon"
              />
            </a>
            <a href="https://tiktok.com/@pickars">
              <img
                src="https://img.icons8.com/ios/24/666666/tiktok.png"
                alt="TikTok"
                class="social-icon"
              />
            </a>
            <a href="https://twitter.com/pickars">
              <img
                src="https://img.icons8.com/ios/24/666666/twitter.png"
                alt="Twitter"
                class="social-icon"
              />
            </a>
          </div>
          <br />
    
          <p class="paragraph">
            If you have any questions or concerns, our team is always ready to
            assist you.
          </p>
          <p class="paragraph">
            Your satisfaction is our top priority, and we’re honored to be your
            trusted delivery partner.
          </p>
    
          <div class="driver-info-box">
            <img
              src="https://img.icons8.com/ios-filled/50/666666/user.png"
              alt="Driver Icon"
              class="driver-icon"
            />
            <div class="driver-details">
              <span class="driver-name"
                >${riderFullName}</span
              >
              <span>
                <a
                  href="tel:${riderPhoneNumber}"
                  class="driver-phone"
                  >+234${riderPhoneNumber}</a
                >
              </span>
            </div>
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
  
    return htmlContent;
  };
  
  module.exports = generateIncomingDispatch;