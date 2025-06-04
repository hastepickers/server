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
//const customerEarningsRoutes = require("./routes/Customer/customerEarningRoutes");
const requestARide = require("./routes/Customer/requestARideRouter");
const rider = require("./routes/Rider/RiderRouter");
const typeOfVehicle = require("./routes/Admin/TypeOfVehicleRouter");
const chatsMessages = require("./routes/Customer/messagesRouter");
// Import the messagingSockets module
const messagingSockets = require("./socket/MessagingSocket/messagingSockets"); // Adjust the path if necessary
const payment = require("./routes/Payment");
const riders = require("./routes/Rider/RidersRouter");
const company = require("./routes/Rider/CompanyRouter");
const userRiders = require("./routes/Rider/UserRiderRouter");
const wallet = require("./routes/Rider/WalletRouter");

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

app.use(cors({
  origin: '*', // Replace '*' with frontend origin in production
}));

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
//app.use("/api/customer-earnings", verifyToken, customerEarningsRoutes);
app.use("/api/ride", verifyToken, requestARide);
app.use("/api/rider", rider);
app.use("/api/vehicle", typeOfVehicle);
app.use("/api/chat", chatsMessages);
app.use("/api/payment", payment);

app.use("/api/v1/auth/riders", riders);
app.use("/api/v1/user/riders", userRiders);
app.use("/api/v1/wallet/riders", wallet);

app.use("/api/v1/auth/company", company);

// Initialize Socket.IO messaging functionality
messagingSockets(server); // Set up messaging for Socket.IO

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
