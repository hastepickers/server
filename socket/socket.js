module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("bookRide", (data) => {
      console.log("Ride booking request received:", data);
      // Handle ride booking logic here
      io.emit("rideBooked", { message: "Ride booked successfully", data });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
