/**
 * Generates HTML for notifying a customer when a driver accepts their ride.
 */
const generateRideAcceptedNotification = (ride) => {
  if (!ride) {
    console.error("Ride object is missing");
    return null;
  }

  const formatName = (name) => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const customerName = `${formatName(ride.customer.firstName)} ${formatName(
    ride.customer.lastName
  )}`;
  const pickupLocation = ride.pickup?.pickupAddress || "Not provided";
  const deliveryCode = ride.pickup?.pickupCode || "N/A";
  const riderFullName = `${formatName(ride.rider.firstName)} ${formatName(
    ride.rider.lastName
  )}`;
  const riderPhoneNumber = ride.rider.phoneNumber || "N/A";
  const totalPrice = ride.totalPrice
    ? `₦${ride.totalPrice.toLocaleString()}`
    : "N/A";

  // Modern Card-style layout for delivery stops (instead of a messy table)
  const deliveryStopsHtml = ride.deliveryDropoff
    .map(
      (dropoff, index) => `
      <div style="padding: 12px; border-bottom: 1px solid #eee; margin-bottom: 5px;">
        <p style="margin: 0; font-size: 13px; color: #999;">STOP ${
          index + 1
        }</p>
        <p style="margin: 4px 0; font-size: 15px; color: #333;"><strong>${
          dropoff.deliveryAddress
        }</strong></p>
        <p style="margin: 0; font-size: 14px; color: #555;">Reciever: ${formatName(
          dropoff.receiverName
        )} • ${dropoff.receiverPhoneNumber}</p>
      </div>
    `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: Arial, sans-serif; background-color: #f7f7f7; margin:0; padding:20px; color: #555; }
    .container { max-width:600px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #e0e0e0; overflow:hidden; }
    .logo-box { padding: 25px 20px; font-size: 24px; font-weight: 900; color: #cc0000; letter-spacing: -1px; }
    .content { padding: 0 20px 20px 20px; }
    .status-tag { display: inline-block; background-color: #e6fff0; color: #008037; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
    .header-banner { background-color: #1a1a1a; margin: 0 20px; border-radius: 12px; padding: 30px 20px; text-align: center; }
    .code-text { font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #ffffff; margin: 0; }
    .rider-card { margin: 20px 0; padding: 15px; border: 1px dashed #ccc; border-radius: 8px; text-align: center; background-color: #fafafa; }
    .price-display { font-size: 24px; font-weight: bold; color: #333; text-align: right; margin-top: 20px; }
    .footer { padding: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
    .social-links { margin-top: 10px; font-weight: bold; color: #999; font-size: 11px; }
  </style>
  </head>
  <body>
    <div class="container">
      <div class="logo-box">PICKARS</div>
      
      <div class="content">
        <div class="status-tag">RIDER ASSIGNED</div>
        <p style="font-size: 16px; margin: 10px 0;">Hi <strong>${customerName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.5;">Great news! A rider has accepted your request and is heading to your pickup location.</p>
        
        <p style="margin-top: 20px; margin-bottom: 5px; font-weight: bold;">Pickup Location:</p>
        <p style="margin: 0; font-size: 15px; color: #333;">${pickupLocation}</p>
      </div>

      <div class="header-banner">
        <p style="color: #999; font-size: 12px; margin-top: 0; margin-bottom: 10px; letter-spacing: 1px;">DELIVERY CODE</p>
        <div class="code-text">${deliveryCode}</div>
      </div>

      <div class="content">
        <div class="rider-card">
          <span style="font-size: 12px; color: #999; text-transform: uppercase;">Your Rider</span>
          <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #333;">${riderFullName}</p>
          <a href="tel:${riderPhoneNumber}" style="color: #cc0000; text-decoration: none; font-weight: bold;">Call +234${riderPhoneNumber}</a>
        </div>

        <p style="font-weight: bold; margin-bottom: 10px; color: #333;">Delivery Destinations:</p>
        <div style="background: #fff; border: 1px solid #eee; border-radius: 8px;">
          ${deliveryStopsHtml}
        </div>

        <div class="price-display">Total: ${totalPrice}</div>
      </div>

      <div class="footer">
        <p>The Pickars Team | <a href="mailto:support@pickars.com" style="color: #cc0000; text-decoration: none;">support@pickars.com</a></p>
        <div class="social-links">INSTAGRAM • FACEBOOK • TIKTOK • TWITTER</div>
      </div>
    </div>
  </body>
  </html>
    `;
};

module.exports = generateRideAcceptedNotification;
