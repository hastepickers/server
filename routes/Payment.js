const express = require("express");
const axios = require("axios");
const RequestARide = require("../models/Customer/RequestARideSchema");
const { sendEmail } = require("../utils/emailUtils");
const { sendSMS } = require("../utils/sendSMS");
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
        const subject = "Payment Confirmed - Pickars";

        const htmlReceipt = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F2F2F7; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { padding: 32px 24px; text-align: center; }
    .logo { width: 80px; height: 80px; margin-bottom: 16px; }
    .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; background-color: #E8F5E9; color: #2E7D32; font-weight: 600; font-size: 12px; text-transform: uppercase; }
    .amount-section { text-align: center; padding: 0 24px 32px; }
    .label { color: #8E8E93; font-size: 14px; margin-bottom: 8px; }
    .amount { font-size: 42px; font-weight: 800; color: #1C1C1E; margin: 0; }
    .dashed-line { border-top: 1px dashed #E5E5EA; margin: 0 24px; height: 1px; }
    .info-section { padding: 24px; }
    .section-title { color: #8E8E93; font-size: 12px; font-weight: 700; letter-spacing: 1px; margin-bottom: 16px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .info-label { color: #636366; }
    .info-value { color: #1C1C1E; font-weight: 600; text-align: right; }
    .footer { text-align: center; padding: 24px; color: #AEAEB2; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://your-domain.com/assets/newlogored.png" alt="Pickars Logo" class="logo">
      <br/>
      <div class="status-badge">Payment Successful</div>
    </div>

    <div class="amount-section">
      <p class="label">Total Amount Paid</p>
      <h1 class="amount">₦${(paymentData.amount / 100).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
      })}</h1>
    </div>

    <div class="dashed-line"></div>

    <div class="info-section">
      <div class="section-title">TRANSACTION DETAILS</div>
      <div class="info-row">
        <span class="info-label">Date & Time</span>
        <span class="info-value">${new Date(
          paymentData.paid_at
        ).toLocaleString()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Reference</span>
        <span class="info-value">${reference}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Method</span>
        <span class="info-value">${paymentData.channel.toUpperCase()}</span>
      </div>
    </div>

    <div style="height: 1px; background: #F2F2F7; margin: 0 24px;"></div>

    <div class="info-section">
      <div class="section-title">CUSTOMER INFO</div>
      <div class="info-row">
        <span class="info-label">Billed To</span>
        <span class="info-value">${firstName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">${customerEmail}</span>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing Pickars!</p>
      <p>This is a computer-generated receipt for ride #${orderID.slice(
        -6
      )}.</p>
    </div>
  </div>
</body>
</html>
`;

        const emailBody = `
          Hi ${firstName},

          Your payment for ride order #${orderID} has been successfully processed.
          
          Amount: NGN ${amountPaid}
          Reference: ${reference}
          Date: ${new Date(paymentData.paid_at).toLocaleString()}

          Safe travels!
          Team Pickars
        `;
        const textFallback = `Hi ${firstName}, your payment of NGN ${
          paymentData.amount / 100
        } for ride #${orderID} was successful.`;
        // Pass the htmlReceipt variable created above as the 4th argument
        await sendEmail(customerEmail, subject, textFallback, htmlReceipt);
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
