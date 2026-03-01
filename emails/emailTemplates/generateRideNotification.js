const generateRideNotification = (ride, status, recipientType) => {
  if (!ride || !status) {
    console.error("Ride object or status missing");
    return null;
  }

  const formatName = (name) =>
    name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

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

  let deliveryLocationsHtml = "";
  if (ride.deliveryDropoff && ride.deliveryDropoff.length > 0) {
    deliveryLocationsHtml = `
      <div style="margin: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #333;">Delivery Details</h3>
    `;
    ride.deliveryDropoff.forEach((dropoff, index) => {
      deliveryLocationsHtml += `
        <div style="margin-bottom: 12px; font-size: 14px; color: #555; border-bottom: 1px solid #eee; padding-bottom: 8px;">
          <strong>Stop ${index + 1}:</strong> ${dropoff.deliveryAddress}<br/>
          <strong>Receiver:</strong> ${formatName(dropoff.receiverName)} (${dropoff.receiverPhoneNumber})
        </div>
      `;
    });
    deliveryLocationsHtml += `</div>`;
  }

  let headerText, bodyIntro, instruction, riderInfoSection = "";

  switch (status.toLowerCase()) {
    case "acceptride":
      headerText = "Ride Accepted";
      bodyIntro = `Great news, ${customerName}! Your delivery request has been accepted.`;
      instruction = `Share the delivery code with the rider upon arrival.`;
      break;
    case "startride":
      headerText = "Delivery in Progress";
      bodyIntro = `Rider ${riderFullName} has picked up your package and is on the move.`;
      instruction = `You can now track your delivery in the app.`;
      break;
    case "endride":
      headerText = "Delivery Completed";
      bodyIntro = `Your package has been delivered successfully. Thank you for using Pickars!`;
      instruction = `We hope you had a great experience.`;
      break;
    case "cancelride":
      headerText = "Ride Cancelled";
      bodyIntro = `Your delivery request has been cancelled.`;
      instruction = `If you didn't authorize this, please contact support.`;
      break;
    default:
      headerText = "Delivery Update";
      bodyIntro = `There is an update regarding your delivery request.`;
      instruction = `Check your app for more details.`;
  }

  if (recipientType === "customer" && ride.rider && (status === "acceptride" || status === "startride")) {
    riderInfoSection = `
      <div style="margin: 20px; padding: 15px; border: 1px dashed #ccc; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-weight: bold; color: #333;">Rider Assigned</p>
        <p style="margin: 5px 0; font-size: 18px; color: #555;">${riderFullName}</p>
        <a href="tel:${riderPhoneNumber}" style="color: #cc0000; text-decoration: none; font-weight: bold;">Call +234${riderPhoneNumber}</a>
      </div>
    `;
  }

  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; color: #555; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden; }
        .logo-box { padding: 25px 20px; font-size: 24px; font-weight: 900; color: #cc0000; letter-spacing: -1px; }
        .header-banner { background-color: #1a1a1a; margin: 0 20px; border-radius: 12px; padding: 30px 20px; text-align: center; }
        .code-text { font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #ffffff; margin: 0; }
        .content { padding: 10px 20px; }
        .status-title { font-size: 20px; font-weight: 700; color: #333; margin-bottom: 10px; }
        .paragraph { font-size: 15px; line-height: 1.6; margin: 12px 0; }
        .price-tag { font-size: 22px; font-weight: bold; color: #333; margin: 20px 0; text-align: right; }
        .footer { padding: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; }
        .social-links { margin-top: 10px; font-weight: bold; color: #999; font-size: 11px; }
      </style>
      </head>
      <body>
      <div class="container">
        <div class="logo-box">PICKARS</div>
  
        <div class="content">
          <p class="paragraph">Hi <strong>${customerName}</strong>,</p>
          <div class="status-title">${headerText}</div>
          <p class="paragraph">${bodyIntro}</p>
          <p class="paragraph" style="font-style: italic; color: #888;">${instruction}</p>
        </div>

        ${status.toLowerCase() !== "cancelride" ? `
          <div style="padding: 0 20px;"><p class="paragraph"><strong>Pickup Code:</strong></p></div>
          <div class="header-banner">
            <div class="code-text">${deliveryCode}</div>
          </div>
          <div class="content">
            <p class="paragraph"><strong>Pickup at:</strong> ${pickupLocation}</p>
          </div>
        ` : ""}
  
        ${deliveryLocationsHtml}
  
        <div class="content">
          ${recipientType === "customer" ? `<div class="price-tag">Total: ${totalPrice}</div>` : ""}
          ${riderInfoSection}
        </div>

        <div class="footer">
          <p>The Pickars Team | <a href="mailto:support@pickars.com" style="color: #cc0000; text-decoration: none;">support@pickars.com</a></p>
          <p>If you did not request this service, please contact us immediately.</p>
          <div class="social-links">INSTAGRAM • FACEBOOK • TIKTOK • TWITTER</div>
        </div>
      </div>
      </body>
      </html>
      `;
};

module.exports = generateRideNotification;