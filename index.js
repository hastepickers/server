const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/Customer/authRouter");
const userRoutes = require("./routes/Customer/userRouter");
const verifyToken = require("./utils/verifyToken");
const requestARide = require("./routes/Customer/requestARideRouter");
const rider = require("./routes/Rider/RiderRouter");
const typeOfVehicle = require("./routes/Admin/TypeOfVehicleRouter");
const chatsMessages = require("./routes/Customer/messagesRouter");
const messagingSockets = require("./socket/MessagingSocket/messagingSockets");
const payment = require("./routes/Payment");
const riders = require("./routes/Rider/RidersRouter");
const company = require("./routes/Rider/CompanyRouter");
const userRiders = require("./routes/Rider/UserRiderRouter");
const wallet = require("./routes/Rider/WalletRouter");
const pop = require("./routes/Notifications/Notifications");
const investorRoutes = require("./routes/Investor/investorRoutes"); // This line imports the router
const admin = require('./routes/Admin/AdminRouter')
const dashboard = require('./routes/Admin/adminDashboardRoutes')

dotenv.config();

const app = express();

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("MongoDB connected");

    // --- DELETE ALL USERS START ---
    // try {
    //   // Import your User model (make sure the path is correct)
    //   const User = require("./models/Customer/User"); // Adjust path if needed
    //   const result = await User.deleteMany({});
    //   console.log(`🧹 Cleanup: Deleted ${result.deletedCount} users from the database.`);
    // } catch (err) {
    //   console.error("Failed to delete users:", err);
    // }
    // --- DELETE ALL USERS END ---
  })
  .catch((err) => console.log("MongoDB connection error:", err));
const server = http.createServer(app);

app.get("/", (req, res) => {
  res.send("Server is running");
});

const deviceTokens = new Set();

// app.post("/api/v1/push/notifications/register-device-token", (req, res) => {
//   const { deviceToken } = req.body;
//   console.log("✅ device token:", deviceToken);

//   if (!deviceToken) {
//     return res.status(400).json({ message: "Device token is required." });
//   }

//   if (!deviceTokens.has(deviceToken)) {
//     deviceTokens.add(deviceToken);
//     console.log("✅ Registered device token:", deviceToken);
//   } else {
//     console.log("ℹ️ Device token already registered:", deviceToken);
//   }

//   return res.status(200).json({ message: "Device token registered." });
// });

app.use("/api/auth", authRoutes);
app.use("/api/user", verifyToken, userRoutes);
app.use("/api/ride", verifyToken, requestARide);
app.use("/api/rider", rider);
app.use("/api/vehicle", typeOfVehicle);
app.use("/api/chat", chatsMessages);
app.use("/api/payment", payment);

app.use("/api/v1/auth/investors", investorRoutes);

app.use("/api/v1/auth/riders", riders);
app.use("/api/v1/user/riders", userRiders);
app.use("/api/v1/wallet/riders", wallet);

app.use("/api/v1/auth/company", company);
app.use("/api/v1/notification", pop);

app.use("/api/v1/admin", admin);
app.use("/api/v1/admin/dashboard", dashboard);

messagingSockets(server);

const PORT = process.env.PORT || 5200;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
