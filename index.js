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

app.post("/register-token", (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Device token is required" });
  }

  console.log(`Received device token: ${token}`);
  deviceTokens.add(token);
  res.status(200).json({ message: "Token registered successfully!" });
});

app.post("/send-notification", async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required" });
  }

  if (deviceTokens.size === 0) {
    return res
      .status(404)
      .json({
        message: "No device tokens registered to send notifications to.",
      });
  }

  const tokensArray = Array.from(deviceTokens);
  console.log(
    `Attempting to send notification to ${tokensArray.length} devices.`
  );

  try {
    console.log(
      `Conceptual notification sent: Title - "${title}", Body - "${body}" to ${tokensArray.length} devices.`
    );
    res
      .status(200)
      .json({ message: "Notification send simulated successfully!" });
  } catch (error) {
    console.error("Error sending message (conceptual):", error);
    res
      .status(500)
      .json({ error: "Failed to send notification (conceptual)." });
  }
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
