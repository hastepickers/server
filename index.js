// Import required modules
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/Customer/authRouter");
const userRoutes = require("./routes/Customer/userRouter");
const verifyToken = require("./utils/verifyToken");
const customerEarningsRoutes = require("./routes/Customer/customerEarningRoutes");
const requestARide = require("./routes/Customer/requestARideRouter");
const rider = require("./routes/Rider/RiderRouter");
const typeOfVehicle = require("./routes/Admin/TypeOfVehicleRouter");
const chatsMessages = require("./routes/Customer/messagesRouter");
// Import the messagingSockets module
const messagingSockets = require("./socket/MessagingSocket/messagingSockets"); // Adjust the path if necessary
const payment = require("./routes/Payment");
// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection setup
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Create HTTP server for Express app
const server = http.createServer(app);

// Test route to check server status
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Link the authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/user", verifyToken, userRoutes);
app.use("/api/customer-earnings", verifyToken, customerEarningsRoutes);
app.use("/api/ride", verifyToken, requestARide);
app.use("/api/rider", rider);
app.use("/api/vehicle", typeOfVehicle);
app.use("/api/chat", verifyToken, chatsMessages);
app.use("/api/payment", payment);

// Initialize Socket.IO messaging functionality
messagingSockets(server); // Set up messaging for Socket.IO

// Set the port and start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
