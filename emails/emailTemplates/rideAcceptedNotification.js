// utils/emailTemplates/rideAcceptedNotification.js

/**
 * Generates HTML for notifying a customer when a driver accepts their ride.
 *
 * @param {object} ride - The ride object from the RequestARide model.
 * @returns {string} - HTML email content.
 */
const generateRideAcceptedNotification = (ride) => {
  if (!ride) {
    console.error("Ride object is missing");
    return null;
  }

  // Format names with capital first letter
  const formatName = (name) => {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  // Customer name
  const customerName = `${formatName(ride.customer.firstName)} ${formatName(
    ride.customer.lastName
  )}`;

  // Pickup location
  const pickupLocation = ride.pickup?.pickupAddress || "Not provided";

  // Delivery code
  const deliveryCode = ride.pickup?.pickupCode || "N/A";

  // Delivery details table rows
  const deliveryRows = ride.deliveryDropoff
    .map(
      (dropoff) => `
        <tr>
          <td style="padding:8px; border:1px solid #ccc;">${
            dropoff.deliveryAddress
          }</td>
          <td style="padding:8px; border:1px solid #ccc;">${formatName(
            dropoff.receiverName
          )}</td>
          <td style="padding:8px; border:1px solid #ccc;">${
            dropoff.receiverPhoneNumber
          }</td>
        </tr>
      `
    )
    .join("");

  // Rider details
  const riderFullName = `${formatName(ride.rider.firstName)} ${formatName(
    ride.rider.lastName
  )}`;
  const riderPhoneNumber = ride.rider.phoneNumber || "N/A";

  // Total price
  const totalPrice = ride.totalPrice
    ? `₦${ride.totalPrice.toLocaleString()}`
    : "N/A";

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: Arial, sans-serif; background-color: #f7f7f7; margin:0; padding:20px; }
    .container { max-width:600px; margin:0 auto; background:#fff; border-radius:8px; border:1px solid #ddd; padding:20px; }
    .header { font-size:22px; font-weight:bold; color:#ff0000; margin-bottom:10px; }
    .paragraph { font-size:16px; color:#555; margin:10px 0; }
    .code-box { text-align:center; font-size:24px; font-weight:bold; color:#fff; background:#ff0000; padding:15px; border-radius:6px; margin:15px 0; }
    table { width:100%; border-collapse:collapse; margin:20px 0; }
    th, td { text-align:left; font-size:14px; }
    th { background:#f4f4f4; font-weight:bold; }
    .footer { text-align:center; font-size:14px; color:#999; margin-top:20px; }
  </style>
  </head>
  <body>
    <div class="container">
      <div class="header">Your Ride is on the Way!</div>
      <p class="paragraph">Hi ${customerName},</p>
      <p class="paragraph">
        A driver has accepted your ride and is on the way to the pickup location below:
      </p>
      <p class="paragraph"><strong>Pickup Location:</strong> ${pickupLocation}</p>
      
      <div class="code-box">Your Delivery Code: ${deliveryCode}</div>
      
      <p class="paragraph"><strong>Rider:</strong> ${riderFullName} | Phone: ${riderPhoneNumber}</p>
      
      <h3>Delivery Details</h3>
      <table>
        <thead>
          <tr>
            <th style="padding:8px; border:1px solid #ccc;">Delivery Address</th>
            <th style="padding:8px; border:1px solid #ccc;">Receiver Name</th>
            <th style="padding:8px; border:1px solid #ccc;">Phone</th>
          </tr>
        </thead>
        <tbody>
          ${deliveryRows}
        </tbody>
      </table>
      
      <p class="paragraph"><strong>Total Price:</strong> ${totalPrice}</p>
      
      <p class="footer">Thank you for choosing Pickars!</p>
    </div>
  </body>
  </html>
    `;
};

module.exports = generateRideAcceptedNotification;
