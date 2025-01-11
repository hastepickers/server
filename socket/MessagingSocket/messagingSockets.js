const { Server } = require("socket.io");
const RequestARide = require("../../models/Customer/RequestARideSchema");
//const Rider = require("../../models/Rider/RiderSchema");
const MessageSupport = require("../../models/Customer/MessageSupport");
const DriversMessage = require("../../models/Customer/DriversMessage");
const { default: mongoose } = require("mongoose");
const Rider = require("../../models/Rider/RiderSchema");
const RideSocket = require("../../models/Rider/RideSocket");

// Calculate distance between two geographic points using the Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = degToRad(lat2 - lat1); // Convert degrees to radians
  const dLon = degToRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(lat1)) *
      Math.cos(degToRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Convert degrees to radians
const degToRad = (deg) => deg * (Math.PI / 180);

// Fetch the closest riders based on pickup location
const getClosestRiders = async (pickupLatitude, pickupLongitude) => {
  try {
    const riders = await Rider.find().limit(6).exec();
    const closestRiders = riders
      .map((rider) => {
        const {
          riderLocation,
          firstName,
          lastName,
          driverRating,
          imageUrl,
          plateNumber,
          phoneNumber,
          verified,
          _id,
        } = rider;
        if (riderLocation?.ridersLatitude && riderLocation?.ridersLongitude) {
          const distance = calculateDistance(
            pickupLatitude,
            pickupLongitude,
            riderLocation.ridersLatitude,
            riderLocation.ridersLongitude
          );
          return {
            id: _id,
            firstName: firstName,
            lastName: lastName,
            rider: `${firstName} ${lastName}`,
            distance: distance.toFixed(2), // Distance in km
            driverRating: driverRating?.rating,
            imageUrl,
            plateNumber,
            phoneNumber,
            verified,
          };
        }
      })
      .filter(Boolean); // Remove undefined values from the array

    return closestRiders;
  } catch (error) {
    console.error("Error fetching riders:", error);
    return [];
  }
};

const messagingSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Replace with your client app URL in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`User connecteds: ${socket.id}`);

    socket.on("offer", (data) => {
      console.log("Offer received from:", socket.id);
      socket.to(data.to).emit("offer", {
        from: data.to,
        offer: data.offer,
      });
    });

    // Relay answer to the target peer
    socket.on("answer", (data) => {
      console.log("Answer received from:", data.to);
      socket.to(data.to).emit("answer", {
        from: data.to,
        answer: data.answer,
      });
    });

    // Relay ICE candidates to the target peer
    socket.on("ice-candidate", (data) => {
      console.log("ICE candidate received from:", data.to);
      socket.to(data.to).emit("ice-candidate", {
        from: data.to,
        candidate: data.candidate,
      });
    });

    // Join a specific group/room
    socket.on("join_group_ride_message", async (groupId) => {
      console.log(`User ${groupId} joined group: ${groupId}`);
      socket.join(groupId);

      try {
        // Check if group exists in the database
        const group = await DriversMessage.findOne({ groupId: groupId });

        if (!group) {
          // If the group doesn't exist, create a new one
          const newGroup = new DriversMessage({
            groupId: groupId,
            messages: [],
          });
          await newGroup.save();
          console.log(`New group created with ID: ${groupId}`);
        }
      } catch (err) {
        console.error("Error checking group in DB:", err);
      }
    });

    // Handling incoming messages and saving them to the database
    socket.on("send_message_ride_message", async (data) => {
      console.log("Received data:", data); // Debug the incoming data

      const { groupId, message, sender, uuid } = data;

      console.log(groupId, message, sender, uuid, "communication"); // Log the extracted values

      try {
        // Find the group in the database
        const group = await DriversMessage.findOne({ groupId: groupId });

        if (group) {
          // Add the new message to the group's message list
          group.messages.push({
            message: message,
            sender: sender,
            status: "delivered",
            timestamp: new Date(),
            uuid: uuid, // Save the UUID along with the message
          });

          // Save the updated group document
          await group.save();
          console.log(`Message from ${sender} saved to group ${groupId}`);

          // Emit the message to all users in the group
          io.to(groupId).emit("receive_message_ride_message", {
            sender: sender,
            message: message,
            uuid: uuid, // Emit the UUID back to the group
            timestamp: new Date().toISOString(),
            status: "delivered", // Use ISO format for consistency
          });
        } else {
          console.log(
            `Group with ID ${groupId} not found in DB, unable to save message.`
          );
        }
      } catch (err) {
        console.error("Error saving message to DB:", err);
      }
    });
    socket.on("sendMessageSupportRoom", (userId) => {
      console.log(`User ${userId} joining room`);
      // Join the room based on userId
      socket.join(userId);
    });

    socket.on("sendMessageSupport", async (data) => {
      const { userId, type, message } = data;

      console.log(`Received message from user ${userId}:`, type, message);

      try {
        // Find existing chat for the user
        let supportChat = await MessageSupport.findOne({ userId });

        // Create new chat if it doesn't exist
        if (!supportChat) {
          supportChat = new MessageSupport({
            userId,
            messages: [],
          });
        }

        // Add the new message to the chat
        const newMessage = {
          userId,
          message: message.content,
          sender: message.sender,
          timestamp: new Date(),
          seenSupport: false,
          seenCustomer: false,
        };

        supportChat.messages.push(newMessage);

        // Save the updated chat
        await supportChat.save();

        // Emit the newly saved message to the specific user
        io.to(userId).emit("receiveSupportMessage", newMessage);
        // Confirm message status to the sender
        socket.emit("messageStatus", { status: "sent", message });
      } catch (error) {
        console.error("Error processing support message:", error);

        // Notify the sender of the error
        socket.emit("messageStatus", { status: "error", error: error.message });
      }
    });

    socket.on("updateMessageSeenStatus", async (data) => {
      const { userId } = data;
      console.log(userId, "updateMessageSeenStatusupdateMessageSeenStatus");
      try {
        // Update all messages for the specified userId to set seenCustomer to true
        await MessageSupport.updateOne(
          { userId }, // Find the user's chat document
          {
            $set: {
              "messages.$[message].seenCustomer": true, // Update only messages that haven't been seen
            },
          },
          {
            arrayFilters: [{ "message.seenCustomer": false }], // Filter messages to apply the update
            multi: true, // Update multiple entries in the messages array
          }
        );

        console.log(
          `All messages for user ${userId} marked as seen by customer.`
        );

        io.to(userId).emit("messageSeenUpdatedCustomer", {
          seen: true,
        });

        // Optionally, broadcast an update to the client
        socket.emit("messageSeenUpdated", { userId, status: "success" });
      } catch (error) {
        console.error("Error updating seenCustomer status:", error);

        // Notify the client of the error
        socket.emit("messageSeenUpdated", {
          userId,
          status: "error",
          error: error.message,
        });
      }
    });
    // O

    socket.on("supportMessaging", async (userId, type) => {
      try {
        console.log(userId, type, "userId, type");
        if (type === "new") {
          console.log("Yenewah");
        } else if (type === "old") {
          console.log("old");
        }

        socket.join(userId);

        io.to(userId).emit("supportMessaging", {
          message: ` with ID ${userId} has joined the group!`,
        });
      } catch (error) {
        console.error("Error fetching  details:", error);

        socket.emit("error", "An error occurred while fetching the  details");
      }
    });

    // Ha

    socket.on("joinRiderss", async (userId) => {
      try {
        // Fetch rider details
        const rider = await Rider.findById(userId);

        if (!rider) {
          console.log(`No rider found with ID: ${userId}`);
          socket.emit("error", `No rider found with ID: ${userId}`);
          return;
        }

        // Join the group and the individual rider room
        //socket.join(groupId);
        socket.join(userId);

        console.log(`Rider with ID: ${userId} joined the group}`);
        // Emit the message only to the user with the same rider ID

        io.to(userId).emit("riderJoined", {
          message: `Riderdwx with ID ${userId} has joined the group!`,
        });

        // Listen for further messages specifically for the rider
        // socket.on("riderJoined", (messageFromRider) => {
        //   console.log(`Message from Rider ID: ${userId}:`, messageFromRider);
        // });
      } catch (error) {
        console.error("Error fetching rider details:", error);
        socket.emit(
          "error",
          "An error occurred while fetching the rider details"
        );
      }
    });
    socket.on("sendMessageToRiderss", (messageData, groupId) => {
      const { senderId, message } = messageData;
      console.log(`Message from ${senderId} to group ${groupId}: ${message}`);

      // Emit the message to all clients in the group
      io.to(groupId).emit("receiveMessageRiderss", messageData);
    });

    socket.on("joinDriver", async (riderId) => {
      console.log(riderId, "riderIdriderIdriderId");

      try {
        const rider = await Rider.findById(riderId);

        if (!rider) {
          console.log(`No rider found with ID: ${riderId}`);
          return;
        }

        socket.join(riderId);
        console.log(`Rider with ID: ${riderId} joined the room`);
        // io.to(riderId).emit("riderJoined", messageData);
        //6777ce3701ac7202127a0e6e
        // When a rider joins, emit the message to the rider

        io.to(riderId).emit("riderJoined", {
          message: `Rider with ID ${riderId} has joined the groupsss!`,
        });
      } catch (error) {
        console.error("Error fetching rider details:", error);
        socket.emit(
          "error",
          "An error occurred while fetching the rider details"
        );
      }
    });

    // Handle user joining a group
    socket.on("joinGroup", (userId, groupId) => {
      console.log(
        `User ${userId} joined group ${groupId} with socket ID: ${socket.id}`
      );
      socket.join(groupId);
    });

    // Handle sending a message to a group
    socket.on("sendMessageToGroup", (messageData, groupId) => {
      const { senderId, message } = messageData;
      console.log(`Message from ${senderId} to group ${groupId}: ${message}`);
      io.to(groupId).emit("receiveMessage", messageData);
    });

    socket.on("acceptRide", async (payload) => {
      if (!payload) {
        console.error("No data received for acceptRide event.");
        return;
      }
      console.log(payload, "hjdriverIddriverId");
      const { rideId, driverId, ride } = payload;

      // Validate payload
      if (!rideId || !driverId || !ride) {
        console.error("Invalid data received for acceptRide event.", payload);
        return;
      }

      // Fetch all riders from the database
      const allRiders = await Rider.find({}); // Empty object means no filter
      if (allRiders.length === 0) {
        console.log("No riders found in the database.");
      } else {
        console.log("All riders:", allRiders);
      }

      let rider; // Declare rider outside try block

      try {
        if (!mongoose.Types.ObjectId.isValid(driverId)) {
          console.error(`Invalid ObjectId: ${driverId}`);
          return;
        }

        // Fetch rider details
        rider = await Rider.findById(driverId); // Uses _id field internally
        if (!rider) {
          console.error(`No rider found with ID: ${driverId}`);
          return;
        }
        console.log("Rider found:", rider);
      } catch (error) {
        console.error("Error fetching rider:", error.message);
        return; // Exit if error occurs
      }

      console.log("Rider Details:", rider, ride);

      const rideObject = ride?._id;
      // Update the ride with the rider details
      const updatedRide = await RequestARide.findByIdAndUpdate(
        rideObject,
        {
          acceptRide: true,
          rider: {
            userId: rider._id,
            firstName: rider.firstName,
            lastName: rider.lastName,
            plateNumber: rider.plateNumber,
            imageUrl: rider.imageUrl,
            phoneNumber: rider.phoneNumber,
            driverRating: rider.driverRating,
            riderLocation: rider.riderLocation,
            vehicleType: rider?.vehicleType,
            vehicleName: rider?.vehicleName,
            vehicleColor: rider?.vehicleColor,
          },
        },
        { new: true }
      );

      if (!updatedRide) {
        console.error(`No ride found with ID: ${rideId}`);
        return;
      }

      console.log("Ride updated successfully:", updatedRide);

      // Create a MessageSupport document
      const existingMessageSupport = await MessageSupport.findOne({ rideId });
      if (!existingMessageSupport) {
        const messageSupport = new MessageSupport({
          rideId,
          userId: updatedRide.rider.userId, // Rider's user ID
          messages: [], // Initialize with an empty message array
        });

        await messageSupport.save();
        console.log(
          "MessageSupport document created successfully:",
          messageSupport
        );
      } else {
        console.log("MessageSupport document already exists for this ride.");
      }
      // io.to(rideId).emit("rideBooked", {
      io.to(rideObject).emit("rideBooked", {
        ride: updatedRide,
        rider: rider,
        pairing: false,
        acceptRide: true,
        startRide: false,
        endRide: false,
        reportRide: false,
      });

      console.log("Accept Ride Event Processed Successfully:", {
        rideObject,
      });
    });

    socket.on("startRide", async (payload) => {
      if (!payload) {
        console.error("No data received for startRide event.");
        return;
      }

      const { rideId, driverId, ride } = payload;

      const rideObject = ride?._id;
      // Validate payload
      if (!rideId || !driverId || !ride) {
        console.error("Invalid data received for startRide event.", payload);
        return;
      }

      try {
        // Fetch the rider from the database
        const rider = await Rider.findById(driverId);
        if (!rider) {
          console.error(`No rider found with ID: ${driverId}`);
          return;
        }

        console.log("Rider Details:", rider, ride);

        // Update the ride with startRide status
        const updatedRide = await RequestARide.findByIdAndUpdate(
          rideObject,
          {
            "startRide.isStarted": true, // Set startRide to true
            "startRide.timestamp": new Date(), // Set the current timestamp
          },
          { new: true } // Return the updated document
        );

        if (!updatedRide) {
          console.error(`No ride found with ID: ${rideObject}`);
          return;
        }

        console.log("Ride updated successfully:", updatedRide);

        // Emit event to notify all users in the ride room
        io.to(rideObject).emit("rideBooked", {
          ride: updatedRide,
          rider: rider,
          pairing: false,
          startRide: true, // Notify that the ride has started
          endRide: false,
          reportRide: false,
          acceptRide: true,
        });

        console.log("Start Ride Event Processed Successfully:", {
          ride: updatedRide,
        });
      } catch (error) {
        console.error(
          `Error processing startRide event for ride ID: ${rideId}`,
          error
        );
      }
    });

    socket.on("endRide", async (payload) => {
      if (!payload) {
        console.error("No data received for endRide event.");
        return;
      }

      const { rideId, driverId, ride } = payload;
      const rideObject = ride?._id;
      // Validate payload
      if (!rideId || !driverId) {
        console.error("Invalid data received for endRide event.", payload);
        return;
      }

      try {
        // Fetch the rider from the database
        const rider = await Rider.findById(driverId);
        if (!rider) {
          console.error(`No rider found with ID: ${driverId}`);
          return;
        }

        console.log("Rider Details:", rider);

        // Update the ride with endRide status
        const updatedRide = await RequestARide.findByIdAndUpdate(
          rideObject,
          {
            "endRide.isEnded": true, // Set endRide to true
            "endRide.timestamp": new Date(), // Set the current timestamp
          },
          { new: true } // Return the updated document
        );

        if (!updatedRide) {
          console.error(`No ride found with ID: ${rideObject}`);
          return;
        }

        console.log("Ride updated successfully:", updatedRide);

        // Emit event to notify all users in the ride room
        io.to(rideObject).emit("rideBooked", {
          ride: updatedRide,
          rider: rider,
          pairing: false,
          startRide: true, // Indicate the ride had started
          endRide: true, // Notify that the ride has ended
          reportRide: false,
          acceptRide: true,
        });

        console.log("End Ride Event Processed Successfully:", {
          ride: updatedRide,
        });
      } catch (error) {
        console.error(
          `Error processing endRide event for ride ID: ${rideObject}`,
          error
        );
      }
    });

    socket.on("cancelRide", async (payload) => {
      if (!payload) {
        console.error("No data received for cancelRide event.");
        return;
      }

      const { rideId, driverId } = payload;
      console.log(rideId, "payloadpayloadpayloadpayload");
      // Validate payload
      if (!rideId) {
        console.error("Invalid data received for cancelRide event.", payload);
        return;
      }

      try {
        // Fetch the rider from the database
        // const rider = await Rider.findById(driverId);
        // if (!rider) {
        //   console.error(`No rider found with ID: ${driverId}`);
        //   return;
        // }

        // console.log("Rider Details:", rider);

        // Update the ride with cancelRide status
        const updatedRide = await RequestARide.findByIdAndUpdate(
          rideId,
          {
            "cancelRide.isCancelled": true, // Set cancelRide to true
            "cancelRide.timestamp": new Date(), // Set the current timestamp
          },
          { new: true } // Return the updated document
        );

        if (!updatedRide) {
          console.error(`No ride found with ID: ${rideId}`);
          return;
        }

        console.log("Ride cancellation processed successfully:", updatedRide);

        // Emit event to notify all users in the ride room
        io.to(rideId).emit("rideBooked", {
          ride: updatedRide,
          //closestRider: rider,
          pairing: false,
          startRide: false, // Indicate the ride has not started
          endRide: false, // Notify that the ride has not ended
          reportRide: false,
          acceptRide: false,
          cancelRide: true, // Notify users about the cancellation
        });

        console.log("Cancel Ride Event Processed Successfully:", {
          ride: updatedRide,
        });
      } catch (error) {
        console.error(
          `Error processing cancelRide event for ride ID: ${rideId}`,
          error
        );
      }
    });

    socket.on("joinRide", async (rideId) => {
      console.log("user, joinedd", rideId);
      try {
        const ride = await RequestARide.findById(rideId).populate(
          "rider.userId customer.customerId"
        );
        if (!ride) {
          console.log("No ride found with that ID");
          return;
        }

        const {
          pickup: { pickupLatitude, pickupLongitude },
        } = ride;

        const { pickup, deliveryDropoff } = ride;

        if (!pickupLatitude || !pickupLongitude) {
          console.log("Invalid pickup location in ride details");
          socket.emit("rideError", {
            message: "Invalid pickup location in ride details",
          });
          return;
        }

        socket.join(rideId);

        const use = "6777ce3701ac7202127a0e6e";
        // Notify the closest rider specifically

        try {
          // Fetch closest riders
          const closestRiders = await Rider.findById(use); // Replace with actual logic to fetch multiple riders if applicable
          if (!closestRiders) {
            console.error("No riders found");
            socket.emit("joinedRide", {
              message: "No riders found",
              error: true,
            });
            return; // Exit early if no riders are found
          }

          console.log(closestRiders, "closestRiders");

          // Emit closest riders to the socket
          socket.emit("closestRiders", { riders: closestRiders });

          // Select the first closest rider (replace with your own logic if needed)
          const closestRider = closestRiders; // Adjust based on data structure
          console.log(closestRider, "closestRider");

          // Emit ride booking details to relevant sockets
          io.to(rideId).emit("rideBooked", {
            ride,
            rider: closestRider,
            pairing: true,
            startRide: ride?.startRide?.isStarted,
            acceptRide: ride?.acceptRide,
            endRide: false,
            reportRide: ride?.startRide?.reportRide,
          });

          // Notify the selected closest rider
          io.to(use).emit("riderJoined", {
            message: `Ride booked!`,
            rideDetails: closestRider,
            error: false,
            rideId,
            ride,
            driverId: use,
            pickup: pickup,
            deliveryDropoff: deliveryDropoff,
            status: "pairing",
          });

          // Save the emitted data into the database
          // Save the emitted data into the database
          const rideSocketData = new RideSocket({
            rideId,
            // rideDetails: closestRider,
            ride,
            driverId: use,
            pickup,
            deliveryDropoff,
            status: "pairing",
          });

          try {
            await rideSocketData.save(); // Attempt to save the ride socket data
            console.log("RideSocket data saved successfully:", rideSocketData);
          } catch (error) {
            // Handle errors during save operation
            console.error("Error saving rideSocket data:", error.message);
          }
        } catch (error) {
          console.error("Error fetching rider details:", error.message);
          socket.emit("joinedRide", {
            message: "An error occurred while fetching rider details",
            error: true,
          });
        }
      } catch (error) {
        console.error("Error fetching ride:", error);
        socket.emit("error", {
          message: "An error occurred while fetching the ride details",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  console.log("Socket.IO server initialized");
};

module.exports = messagingSockets;
