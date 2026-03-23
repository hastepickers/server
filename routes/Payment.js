const express = require("express");
const axios = require("axios");
const RequestARide = require("../models/Customer/RequestARideSchema");
const { sendEmail } = require("../utils/emailUtils");
const { sendSMS } = require("../utils/sendSMS");
const { sendWhatsApp } = require("../utils/sendWhatsApp");
const router = express.Router();

// Paystack secret key
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.error("❌ PAYSTACK_KEY is missing in environment variables");
}

// Route for generating Paystack payment URL
router.post("/create-paystack-payment", async (req, res) => {
  try {
    const { email, amount, currency = "NGN", callback_url } = req.body;

    // Validate required fields
    if (!email || !amount || !callback_url) {
      return res
        .status(400)
        .json({ error: "email, amount, and callback_url are required." });
    }

    // Prepare payload
    const payload = {
      email,
      amount: amount * 100, // Paystack expects the amount in kobo
      currency,
      callback_url,
    };

    console.log(payload, "payloadpayload");
    // Make a request to Paystack API to initialize the payment
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Extract the reference from the Paystack response
    const { reference, authorization_url } = response.data.data;

    // Return the checkout URL and reference

    res.status(200).json({
      checkout_url: authorization_url,
      reference, // Include reference in the response
    });
  } catch (error) {
    console.error("Error creating Paystack payment:", error);
    const errorMessage =
      error.response?.data?.message || "Internal Server Error";
    res.status(500).json({ error: errorMessage });
  }
});

// Route for verifying Paystack payment
router.get("/verify-payment/:orderID", async (req, res) => {
  try {
    const { reference } = req.query;
    const { orderID } = req.params;
    console.log(orderID, "payloadpayload");
    // Validate the orderID and reference
    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required." });
    }
    if (!orderID) {
      return res.status(400).json({ error: "Order ID is required." });
    }

    console.log(reference, orderID, "referencereference");

    // Make a request to Paystack API to verify the payment
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paymentData = response.data.data;
    console.log(response, "paymentData");
    if (paymentData.status === "success") {
      // Payment is successful
      console.log(paymentData, "paymentData");

      const updatedPayment = {
        isPaid: true,
        timestamp: new Date(paymentData.paid_at),
        paymentMethod: paymentData.channel,
        paymentService: "paystack", // Assuming the service is "paystack"
        details: {
          id: reference,
          amount: paymentData.amount / 100, // Convert to the correct currency unit if needed
          gatewayResponse: paymentData.gateway_response,
          reference: paymentData.reference,
          receipt_number: paymentData.receipt_number,
          status: paymentData.status,
          message: paymentData.message,
          paid_at: paymentData.paid_at,
          created_at: paymentData.created_at,
          channel: paymentData.channel,
          currency: paymentData.currency,
          customer: {
            email: paymentData.customer.email,
            phone: paymentData.customer.phone,
          },
          authorization: {
            authorization_code: paymentData.authorization.authorization_code,
            bin: paymentData.authorization.bin,
            last4: paymentData.authorization.last4,
            exp_month: paymentData.authorization.exp_month,
            exp_year: paymentData.authorization.exp_year,
            channel: paymentData.authorization.channel,
            card_type: paymentData.authorization.card_type,
            bank: paymentData.authorization.bank,
            country_code: paymentData.authorization.country_code,
            brand: paymentData.authorization.brand,
            reusable: paymentData.authorization.reusable,
            signature: paymentData.authorization.signature,
            account_name: paymentData.authorization.account_name,
          },
        },
      };

      // Update the ride (order) with the payment information
      const updatedRide = await RequestARide.findOneAndUpdate(
        { _id: orderID }, // Find the ride using the orderID
        { paid: updatedPayment },
        { new: true }
      );

      const customerEmail = paymentData.customer.email;
      const customerPhone =
        paymentData.customer.phone || updatedRide.customer?.phoneNumber;
      const firstName = updatedRide.customer?.firstName || "Customer";

      // 1. Send SMS via Termii
      // if (customerPhone) {
      //   try {
      //     // Format phone: remove '+' and spaces for Termii
      //     const cleanPhone = customerPhone
      //       .toString()
      //       .replace(/\s+/g, "")
      //       .replace("+", "");
      //     const smsMsg = `Hi ${firstName}, your payment of NGN ${amountPaid} for ride #${orderID.slice(
      //       -6
      //     )} was successful. Thank you for choosing Pickars!`;
      //     await sendSMS(cleanPhone, smsMsg);
      //   } catch (smsErr) {
      //     console.error("SMS notification failed:", smsErr.message);
      //   }
      // }

      // 2. Send Email via Zoho
      try {
        const totalPaid = paymentData.amount / 100;
        const vatRate = 0.075;
        const baseAmount = totalPaid / (1 + vatRate);
        const vatAmount = totalPaid - baseAmount;

        // Data from your Mongoose Schema
        const pickupAddr = updatedRide.pickup?.pickupAddress;
        const dropoffs = updatedRide.deliveryDropoff || [];
        const rider = updatedRide.rider;
        const firstName = updatedRide.customer?.firstName || "Customer";

        const subject = `Receipt for Trip #${updatedRide.trackingId.slice(
          0,
          8
        )}`;

        const whatsappMsg = `Hi ${firstName}, your payment of NGN ${totalPaid} for PICKARS ride #${orderID.slice(
          -6
        )} is confirmed! 🚗`;

        // Trigger WhatsApp
        await sendWhatsApp(customerPhone, whatsappMsg);

        const htmlReceipt = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; background-color: #F9F9F9; margin: 0; padding: 20px; color: #1A1A1A; }
            .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #EEE; }
            .brand-header { padding: 25px; background: #FFF; display: flex; justify-content: space-between; align-items: center; }
            .hero { background: #1A1A1A; color: white; padding: 35px 20px; text-align: center; }
            .hero-amount { font-size: 38px; font-weight: 800; margin-top: 5px; color: #FF0000; }
            
            .section { padding: 20px; border-bottom: 1px solid #F1F1F1; }
            .label { font-size: 10px; font-weight: 700; color: #8E8E93; text-transform: uppercase; margin-bottom: 4px; display: block; }
            
            /* Route Stepper */
            .route-box { padding-left: 15px; border-left: 2px solid #EEE; margin-left: 10px; }
            .stop { position: relative; margin-bottom: 15px; }
            .stop:last-child { margin-bottom: 0; }
            .dot { position: absolute; left: -22px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: #FF0000; border: 2px solid #FFF; }
            .address { font-size: 13px; font-weight: 500; color: #333; }

            /* Rider Card */
            .rider-card { display: flex; align-items: center; background: #F8F9FA; padding: 12px; border-radius: 12px; }
            .rider-img { width: 45px; height: 45px; border-radius: 50%; background: #DDD; margin-right: 12px; object-fit: cover; }
            .rider-info { font-size: 13px; font-weight: 600; }
            .vehicle { font-size: 11px; color: #666; font-weight: 400; }

            .fare-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
            .footer { padding: 25px; text-align: center; font-size: 12px; color: #8E8E93; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand-header">
              <span style="font-weight: 900; font-size: 22px; color: #FF0000;">PICKARS</span>
              <span style="font-size: 11px; font-weight: 700; color: #28A745;">COMPLETED</span>
            </div>

            <div class="hero">
              <span style="font-size: 12px; opacity: 0.7;">TOTAL PAID</span>
              <div class="hero-amount">₦${totalPaid.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
              })}</div>
            </div>

            <!-- RIDER INFO -->
            ${
              rider?.firstName
                ? `
            <div class="section">
              <span class="label">Your Rider</span>
              <div class="rider-card">
                ${
                  rider.imageUrl
                    ? `<img src="${rider.imageUrl}" class="rider-img">`
                    : '<div class="rider-img"></div>'
                }
                <div class="rider-info">
                  ${rider.firstName} ${rider.lastName || ""}
                  <div class="vehicle">${
                    rider.vehicleName || "Dispatch Bike"
                  } • ${rider.plateNumber || ""}</div>
                </div>
              </div>
            </div>`
                : ""
            }

            <!-- TRIP ROUTE -->
            <div class="section">
              <span class="label">Trip Route</span>
              <div class="route-box">
                <div class="stop">
                  <div class="dot" style="background: #CCC;"></div>
                  <span class="label" style="margin:0">Pickup</span>
                  <span class="address">${pickupAddr || "Office Pickup"}</span>
                </div>
                ${dropoffs
                  .map(
                    (d) => `
                  <div class="stop">
                    <div class="dot"></div>
                    <span class="label" style="margin:0">Drop-off to ${d.receiverName}</span>
                    <span class="address">${d.deliveryAddress}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>

            <!-- PAYMENT SPECS -->
            <div class="section">
              <div style="display: flex; justify-content: space-between;">
                <div>
                  <span class="label">Date</span>
                  <span style="font-size: 13px; font-weight: 600;">${new Date().toLocaleDateString(
                    "en-GB"
                  )}</span>
                </div>
                <div style="text-align: right;">
                  <span class="label">Reference</span>
                  <span style="font-size: 13px; font-weight: 600;">${updatedRide.trackingId
                    .slice(0, 8)
                    .toUpperCase()}</span>
                </div>
              </div>
            </div>

            <!-- FARE BREAKDOWN -->
            <div class="section" style="background: #FAFAFA; border-bottom: none;">
              <div class="fare-row">
                <span style="color: #666;">Base Fare</span>
                <span>₦${baseAmount.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}</span>
              </div>
              <div class="fare-row">
                <span style="color: #666;">VAT (7.5%)</span>
                <span>₦${vatAmount.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}</span>
              </div>
              <div class="fare-row" style="margin-top: 10px; font-weight: 800; border-top: 1px solid #EEE; padding-top: 10px; color: #FF0000;">
                <span>Total</span>
                <span>₦${totalPaid.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}</span>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for choosing <strong>Pickars</strong>, ${firstName}!</p>
              <p>Tracking ID: ${updatedRide.trackingId}</p>
            </div>
          </div>
        </body>
        </html>`;

        await sendEmail(
          customerEmail,
          subject,
          "Your Pickars Receipt",
          htmlReceipt
        );
      } catch (emailErr) {
        console.error("Email notification failed:", emailErr.message);
      }

      // Handle the case where the ride isn't found (e.g., invalid orderID)
      if (!updatedRide) {
        return res.status(404).json({ error: "Order not found." });
      }

      res.status(200).json({
        message: "Payment verified and updated successfully.",
        updatedRide,
        success: true,
      });
    } else {
      // Payment failed or incomplete
      res.status(400).json({
        message: "Payment verification failed.",
        paymentData,
        success: false,
      });
    }
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    const errorMessage =
      error.response?.data?.message || "Internal Server Error";
    res.status(500).json({ error: errorMessage });
  }
});

module.exports = router;
