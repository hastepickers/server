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
    if (ride.deliveryDropoff.length === 1) {
      const dropoff = ride.deliveryDropoff[0];
      deliveryLocationsHtml = `
          <p class="paragraph">
            <strong>Delivery Location:</strong> ${dropoff.deliveryAddress}<br/>
            <strong>Receiver:</strong> ${formatName(dropoff.receiverName)}<br/>
            <strong>Receiver Phone:</strong> ${dropoff.receiverPhoneNumber}
          </p>
        `;
    } else {
      deliveryLocationsHtml = `<h3 style="margin:20px; color: #555555;">Delivery Locations:</h3><ol style="color: #555555; margin: 12px 20px;">`;
      ride.deliveryDropoff.forEach((dropoff, index) => {
        deliveryLocationsHtml += `
            <li style="margin-bottom: 10px;">
              <strong>${index + 1}. Address:</strong> ${
          dropoff.deliveryAddress
        }<br/>
              <strong>Receiver:</strong> ${formatName(
                dropoff.receiverName
              )}<br/>
              <strong>Receiver Phone:</strong> ${dropoff.receiverPhoneNumber}
            </li>
          `;
      });
      deliveryLocationsHtml += `</ol>`;
    }
  } else {
    deliveryLocationsHtml = `<p class="paragraph">No delivery locations provided.</p>`;
  }

  let headerText,
    bodyIntro,
    instruction,
    riderInfoSection = "";

  switch (status.toLowerCase()) {
    case "acceptride":
      headerText = "Your Ride Has Been Accepted!";
      bodyIntro = `Great news, ${customerName}! Your delivery request has been accepted.`;
      instruction = `Share the delivery code with the rider when they arrive for pickup.`;
      // Rider info only relevant for customer on accept/start
      if (recipientType === "customer") {
        riderInfoSection = `
          <h3 style="margin:20px; color: #555555;">Rider's Contact</h3>
          <div class="driver-info-box">
            <img src="https://img.icons8.com/ios-filled/50/666666/user.png" alt="Driver Icon" class="driver-icon"/>
            <div class="driver-details">
              <span class="driver-name">${riderFullName}</span>
              <span><a href="tel:${riderPhoneNumber}" class="driver-phone">+234${riderPhoneNumber}</a></span>
            </div>
          </div>
        `;
      }
      break;

    case "startride":
      headerText = "Your Delivery is On the Move!";
      bodyIntro = `Your delivery has started! Rider ${riderFullName} is on the way.`;
      instruction = `Track your delivery and keep this code safe for confirmation.`;
      // Rider info only relevant for customer on accept/start
      if (recipientType === "customer") {
        riderInfoSection = `
          <h3 style="margin:20px; color: #555555;">Rider's Contact</h3>
          <div class="driver-info-box">
            <img src="https://img.icons8.com/ios-filled/50/666666/user.png" alt="Driver Icon" class="driver-icon"/>
            <div class="driver-details">
              <span class="driver-name">${riderFullName}</span>
              <span><a href="tel:${riderPhoneNumber}" class="driver-phone">+234${riderPhoneNumber}</a></span>
            </div>
          </div>
        `;
      }
      break;
    case "endride":
      headerText = "Delivery Completed Successfully!";
      bodyIntro = `Your package has been delivered. Thank you for trusting Pickars!`;
      instruction = `If you have feedback or an issue, please contact support.`;
      break;

    case "cancelride":
      headerText = "Your Delivery Has Been Cancelled";
      bodyIntro = `Unfortunately, your delivery request has been cancelled.`;
      instruction = `If this was unexpected, please reach out to support immediately.`;
      break;

    default:
      headerText = "Delivery Update";
      bodyIntro = `Here is the latest update on your delivery.`;
      instruction = `Please follow the instructions as needed.`;
  }

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
          color: #555555;
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
          color: #555555;
          font-size: 24px;
          font-weight: 700;
          margin: 20px;
        }
        .paragraph {
          font-size: 16px;
          color: #555555;
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
          color: #555555;
        }
        .driver-phone {
          font-size: 14px;
          color: #555555;
          text-decoration: none;
        }
        .footer {
          font-size: 14px;
          color: #555555;
          margin: 20px;
        }
        .footer-link {
          color: #555555;
          text-decoration: none;
        }
        .total-price-display {
          font-weight: bold;
          font-size: 28px;
          color: #555555;
          margin: 20px;
       }
      </style>
      </head>
      <body>
      <div class="container">
        <img src="https://res.cloudinary.com/daiiiiupy/image/upload/v1752741191/mainLogo_kurdtf.png"
              alt="Pickars Logo" class="header-logo" />
  
        <p class="paragraph">Hi ${customerName},</p>

        <p class="paragraph paragraph-bold">${headerText}</p>
        <p class="paragraph">${instruction}</p>

        <p class="paragraph">${bodyIntro}</p>
        <br />
        ${
          status.toLowerCase() === "cancelride"
            ? ""
            : `<p class="paragraph paragraph-bold">Your Pickup Code is</p>
                <div class="header-banner">
                  <div class="header-text">${deliveryCode}</div>
                </div>
                <p class="paragraph"><strong>Pickup Location:</strong> ${pickupLocation}</p>`
        }
  
        <br />
  
        ${deliveryLocationsHtml}
  
        ${
          recipientType === "customer"
            ? `<p class="total-price-display">Total Price: ${totalPrice}</p>`
            : ""
        }
        
        ${riderInfoSection}

        <br />
        <div class="social-icons-container">
          <a href="https://instagram.com/pickars"><img src="https://img.icons8.com/ios/24/666666/instagram-new.png" alt="Instagram" class="social-icon"/></a>
          <a href="https://facebook.com/pickars"><img src="https://img.icons8.com/ios/24/666666/facebook-new.png" alt="Facebook" class="social-icon"/></a>
          <a href="https://tiktok.com/@pickars"><img src="https://img.icons8.com/ios/24/666666/tiktok.png" alt="TikTok" class="social-icon"/></a>
          <a href="https://twitter.com/pickars"><img src="https://img.icons8.com/ios/24/666666/twitter.png" alt="Twitter" class="social-icon"/></a>
        </div>
        <br />
  
        <p class="paragraph">If you have any questions or concerns, our team is always ready to assist you.</p>
        <p class="paragraph">Your satisfaction is our top priority, and we’re honored to be your trusted delivery partner.</p>
  
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

module.exports = generateRideNotification;
