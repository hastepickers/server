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
        // Calculate VAT Deductions (Nigeria VAT is 7.5%)
        const totalPaid = paymentData.amount / 100;
        const vatRate = 0.075;
        const baseAmount = totalPaid / (1 + vatRate);
        const vatAmount = totalPaid - baseAmount;

        // Get Ride Locations from your database object
        const pickUp = updatedRide.pickUpLocation?.address || "Selected Pickup";
        const dropOff =
          updatedRide.dropOffLocation?.address || "Selected Destination";

        const subject = "Payment Confirmed - Pickars";
        const htmlReceipt = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FA; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #EEEEEE; }
            .header { padding: 32px 24px; text-align: left; }
            .brand-text { color: #FF0000; font-size: 24px; font-weight: 900; letter-spacing: 2px; }
            .status-badge { float: right; padding: 6px 14px; border-radius: 50px; background-color: #FFF0F0; color: #FF0000; font-weight: 700; font-size: 11px; margin-top: 5px; }
            
            .amount-card { background: #1C1C1E; color: #ffffff; margin: 0 20px; border-radius: 16px; padding: 30px 20px; text-align: center; }
            .amount-label { color: #AEAEB2; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            .main-amount { font-size: 40px; font-weight: 800; margin: 0; }
            
            .breakdown-section { padding: 24px; }
            .breakdown-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #636366; }
            .breakdown-total { border-top: 1px solid #F2F2F7; padding-top: 10px; margin-top: 10px; font-weight: 700; color: #1C1C1E; }
        
            .info-section { padding: 0 24px 24px; }
            .section-title { color: #8E8E93; font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 15px; border-bottom: 1px solid #F2F2F7; padding-bottom: 5px; }
            
            .detail-row { margin-bottom: 12px; }
            .detail-label { font-size: 12px; color: #8E8E93; display: block; margin-bottom: 2px; }
            .detail-value { font-size: 14px; color: #1C1C1E; font-weight: 500; line-height: 1.4; }
        
            .route-container { background: #F2F2F7; padding: 15px; border-radius: 12px; margin-bottom: 20px; }
            .dot { color: #FF0000; font-size: 18px; margin-right: 8px; }
        
            .footer { text-align: center; padding: 30px 24px; color: #AEAEB2; font-size: 12px; line-height: 1.6; }
            .clearfix { clear: both; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="brand-text">PICKARS</span>
              <div class="status-badge">PAID</div>
              <div class="clearfix"></div>
            </div>
        
            <div class="amount-card">
              <div class="amount-label">Transaction Total</div>
              <h1 class="main-amount">₦${totalPaid.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
              })}</h1>
            </div>
        
            <div class="breakdown-section">
              <div class="breakdown-row">
                <span>Base Fare</span>
                <span>₦${baseAmount.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}</span>
              </div>
              <div class="breakdown-row">
                <span>VAT (7.5%)</span>
                <span>₦${vatAmount.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}</span>
              </div>
              <div class="breakdown-row breakdown-total">
                <span>Total Paid</span>
                <span>₦${totalPaid.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                })}</span>
              </div>
            </div>
        
            <div class="info-section">
              <div class="section-title">RIDE DETAILS</div>
              <div class="route-container">
                <div class="detail-row">
                  <span class="detail-label">PICKUP</span>
                  <span class="detail-value">${pickUp}</span>
                </div>
                <div style="height: 10px; border-left: 2px dotted #AEAEB2; margin: -5px 0 5px 5px;"></div>
                <div class="detail-row" style="margin-bottom: 0;">
                  <span class="detail-label">DROPOFF</span>
                  <span class="detail-value">${dropOff}</span>
                </div>
              </div>
        
              <div class="section-title">PAYMENT INFORMATION</div>
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <span class="detail-label">DATE</span>
                    <span class="detail-value">${new Date(
                      paymentData.paid_at
                    ).toLocaleDateString()}</span>
                  </td>
                  <td style="padding-bottom: 10px; text-align: right;">
                    <span class="detail-label">METHOD</span>
                    <span class="detail-value">${paymentData.channel.toUpperCase()}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="detail-label">REFERENCE</span>
                    <span class="detail-value">${reference.slice(
                      0,
                      12
                    )}...</span>
                  </td>
                  <td style="text-align: right;">
                    <span class="detail-label">ORDER ID</span>
                    <span class="detail-value">#${orderID.slice(-6)}</span>
                  </td>
                </tr>
              </table>
            </div>
        
            <div class="footer">
              <p style="color: #FF0000; font-weight: 700; margin-bottom: 5px;">Safe travels, ${firstName}!</p>
              <p>This receipt is automatically generated for your records.<br/>
              Need help? Contact support@pickars.com</p>
            </div>
          </div>
        </body>
        </html>
        `;

        // const emailBody = `
        //   Hi ${firstName},

        //   Your payment for ride order #${orderID} has been successfully processed.

        //   Amount: NGN ${amountPaid}
        //   Reference: ${reference}
        //   Date: ${new Date(paymentData.paid_at).toLocaleString()}

        //   Safe travels!
        //   Team Pickars
        // `;
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
