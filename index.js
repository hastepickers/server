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
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

const server = http.createServer(app);

app.get("/", (req, res) => {
  res.send("Server is running");
});

const deviceTokens = new Set();


app.post("/api/v1/push/notifications/register-device-token", (req, res) => {
  const { deviceToken } = req.body;
  console.log("✅ device token:", deviceToken);

  if (!deviceToken) {
    return res.status(400).json({ message: "Device token is required." });
  }

  if (!deviceTokens.has(deviceToken)) {
    deviceTokens.add(deviceToken);
    console.log("✅ Registered device token:", deviceToken);
  } else {
    console.log("ℹ️ Device token already registered:", deviceToken);
  }

  return res.status(200).json({ message: "Device token registered." });
});



app.use("/api/auth", authRoutes);
app.use("/api/user", verifyToken, userRoutes);
app.use("/api/ride", verifyToken, requestARide);
app.use("/api/rider", rider);
app.use("/api/vehicle", typeOfVehicle);
app.use("/api/chat", chatsMessages);
app.use("/api/payment", payment);

app.use("/api/v1/auth/riders", riders);
app.use("/api/v1/user/riders", userRiders);
app.use("/api/v1/wallet/riders", wallet);

app.use("/api/v1/auth/company", company);

messagingSockets(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
