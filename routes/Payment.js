const express = require("express");
const axios = require("axios");
const RequestARide = require("../models/Customer/RequestARideSchema");
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

    console.log(payload, 'payloadpayload')
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
    console.log(orderID, 'payloadpayload')
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

      // Handle the case where the ride isn't found (e.g., invalid orderID)
      if (!updatedRide) {
        return res.status(404).json({ error: "Order not found." });
      }

      res.status(200).json({
        message: "Payment verified and updated successfully.",
        updatedRide,
        success: true
      });
    } else {
      // Payment failed or incomplete
      res.status(400).json({
        message: "Payment verification failed.",
        paymentData,
        success: false
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
