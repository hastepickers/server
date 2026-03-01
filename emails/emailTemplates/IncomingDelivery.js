/**
 * Generates the HTML content for an incoming delivery notification email.
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
    console.error(`Delivery details for user ${userId} not found on ride ${ride._id}.`);
    return null;
  }

  const receiverName = formatName(deliveryDetails.receiverName);
  const deliveryAddress = deliveryDetails.deliveryAddress;
  const pickupCode = deliveryDetails.parcelId || "N/A";
  const senderName = ride.customer.firstName
    ? `${formatName(ride.customer.firstName)} ${formatName(ride.customer.lastName)}`
    : "A Customer";

  const riderFullName = `${formatName(ride.rider.firstName || "Our")} ${formatName(ride.rider.lastName || "Rider")}`;
  const riderPhoneNumber = ride.rider.phoneNumber || "N/A";

  const htmlContent = `
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
          /* Stylized Text Logo */
          .logo-box {
            padding: 25px 20px;
            font-size: 24px;
            font-weight: 900;
            color: #cc0000;
            letter-spacing: -1px;
          }
          .header-banner {
            background-color: #1a1a1a;
            margin: 0 20px;
            border-radius: 12px;
            padding: 35px 20px;
            text-align: center;
          }
          .header-text {
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 6px;
            color: #ffffff;
            margin: 0;
          }
          .content-area {
            padding: 10px 20px;
          }
          .status-tag {
            display: inline-block;
            background-color: #fff4f4;
            color: #cc0000;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .paragraph {
            font-size: 16px;
            line-height: 1.6;
            margin: 15px 0;
          }
          .driver-info-box {
            margin: 20px 0;
            padding: 15px;
            border: 1px dashed #cccccc;
            border-radius: 8px;
            text-align: center;
            background-color: #fafafa;
          }
          .driver-name {
            display: block;
            font-size: 18px;
            font-weight: bold;
            color: #333333;
            margin-bottom: 5px;
          }
          .driver-phone {
            color: #cc0000;
            text-decoration: none;
            font-weight: bold;
            font-size: 15px;
          }
          .footer {
            padding: 20px;
            border-top: 1px solid #eeeeee;
            font-size: 13px;
            color: #888888;
          }
          .social-links {
            margin-top: 15px;
            font-size: 11px;
            font-weight: bold;
            color: #999999;
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-box">PICKARS</div>
    
          <div class="content-area">
            <div class="status-tag">INCOMING DELIVERY</div>
            <p class="paragraph">Hi <strong>${receiverName}</strong>,</p>
            <p class="paragraph">
              A package from <strong>${senderName}</strong> is on its way to you at <strong>${deliveryAddress}</strong>. 
              Our rider has picked it up and is heading your way.
            </p>
            
            <p class="paragraph" style="font-weight: bold; margin-bottom: 5px;">Your Pickup Code is:</p>
          </div>

          <div class="header-banner">
            <div class="header-text">${pickupCode}</div>
          </div>
    
          <div class="content-area">
            <p class="paragraph" style="font-style: italic; font-size: 14px;">
              Please provide this code to the rider only when they arrive at your location.
            </p>

            <div class="driver-info-box">
              <span style="font-size: 12px; color: #999; text-transform: uppercase;">Assigned Rider</span>
              <span class="driver-name">${riderFullName}</span>
              <a href="tel:${riderPhoneNumber}" class="driver-phone">Call +234${riderPhoneNumber}</a>
            </div>

            <p class="paragraph">
              Thank you for choosing Pickars. We’re honored to be your trusted delivery partner.
            </p>
          </div>
    
          <div class="footer">
            <p>The Pickars Team | <a href="mailto:support@pickars.com" style="color:#cc0000; text-decoration:none;">support@pickars.com</a></p>
            <div class="social-links">
              INSTAGRAM • FACEBOOK • TIKTOK • TWITTER
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return htmlContent;
};

module.exports = generateIncomingDispatch;