const { Server } = require("socket.io");
const RequestARide = require("../../models/Customer/RequestARideSchema");

const bookingRideSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Replace with your client app URL in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // Handle user joining a group based on rideId

    socket.on("joinDriver", async (riderId) => {
        console.log(riderId, 'riderIdriderIdriderId')
      // Fetch the ride details based on the riderId
    });

    socket.on("joinRide", async (rideId, bookingData) => {
      // Join the socket to the ride room based on rideId
      // socket.join(rideId);

      try {
        // Fetch the ride details from the database using the provided rideId (which should be the MongoDB _id)
        const ride = await RequestARide.findById(rideId).populate(
          "rider.userId customer.customerId"
        );
        console.log(`User joining ride ${rideId}`);

        if (!ride) {
          console.log("No ride found with that ID");
          return;
        }

        // Log the fetched ride data for debugging
        console.log("Ride details fetched:", ride);

        // If ride is found, emit the ride booking event to all users in the ride's room
        io.to(rideId).emit("rideBooked", {
          rideDetails: ride,
          // bookingData: bookingData,
        });
      } catch (error) {
        console.error("Error fetching ride:", error);
        io.to(socket.id).emit(
          "error",
          "An error occurred while fetching the ride details"
        );
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  console.log("Socket.IO server for ride bookings initialized");
};

module.exports = bookingRideSocket;
