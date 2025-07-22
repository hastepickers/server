const { Server } = require("socket.io");
const RequestARide = require("../../models/Customer/RequestARideSchema");
//const Rider = require("../../models/Rider/RiderSchema");
const MessageSupport = require("../../models/Customer/MessageSupport");
const DriversMessage = require("../../models/Customer/DriversMessage");
const { default: mongoose } = require("mongoose");
const Rider = require("../../models/Rider/RiderSchema");
const RideSocket = require("../../models/Rider/RideSocket");
const RiderEarnings = require("../../models/Rider/RiderEarnings");
const User = require("../../models/Customer/User");
const { sendCustomerPush, sendIOSPush } = require("../../utils/sendIOSPush");
const DeviceToken = require("../../models/DeviceToken");
const { sendEmail } = require("../../utils/emailUtils");
const { notificationTexts } = require("../../utils/notificationTexts");
const generateIncomingDispatch = require("../../emails/emailTemplates/IncomingDelivery");
const notifyUsers = require("../../emails/emailTemplates/notifyUsers");
const notifyDriver = require("../../emails/emailTemplates/notifyDriver");
const DriverDeviceToken = require("../../models/DriverDeviceToken");
const { capitalize } = require("../../utils/capitalize");

// Calculate distance between two geographic points using the Haversine formula

async function removeReceivingItemsForRide(rideId) {
  try {
    // Find all users who have any receivingItem with the given rideId
    const usersToUpdate = await User.find({ "receivingItems.rideId": rideId });

    if (usersToUpdate.length === 0) {
      console.log(`No users found with receivingItems for rideId: ${rideId}`);
      return;
    }

    for (const user of usersToUpdate) {
      const initialCount = user.receivingItems.length;
      user.receivingItems = user.receivingItems.filter(
        (item) => !item.rideId.equals(rideId)
      );
      if (user.receivingItems.length < initialCount) {
        await user.save();
        console.log(
          `✅ Removed receivingItems for rideId ${rideId} from user: ${user._id}`
        );
      }
    }
  } catch (error) {
    console.error(
      `❌ Error removing receivingItems for rideId ${rideId}:`,
      error.message
    );
  }
}
const addRiderEarnings = async (riderId, fare) => {
  try {
    if (!riderId || !fare) {
      console.error("❌ Missing earnings data.");
      return;
    }

    // Fetch the rider
    const rider = await Rider.findById(riderId);
    if (!rider) {
      console.error(`❌ Rider not found with ID: ${riderId}`);
      return;
    }

    // Calculate earnings (5% of fare)
    const useAmount = fare * 0.05;
    const newEarning = new RiderEarnings({
      riderId,
      amount: useAmount,
      header: "Ride Earnings",
      status: "Completed",
    });

    // Save earnings
    const savedEarning = await newEarning.save();

    // Update total earnings for the rider
    rider.totalEarnings += useAmount;
    await rider.save();

    console.log("💰 Earnings Added:", savedEarning);
  } catch (error) {
    console.error("❌ Error adding rider earnings:", error);
  }
};

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
const users = {};

const messagingSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Replace with your client app URL in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`User connecteds: ${socket.id}`);

    socket.on("join", (room) => {
      socket.join(room);
      users[socket.id] = room;
      console.log(`User ${socket.id} joined room ${room}`);

      // Notify others in the room that a new user joined
      socket.to(room).emit("new-user", socket.id);
    });

    // Start a group call, notify all users in the room
    socket.on("start-call", () => {
      const room = users[socket.id];
      if (!room) return;

      console.log(`User ${socket.id} started a call in room ${room}`);

      // Notify all users in the room about an incoming call
      socket.to(room).emit("incoming-call", { from: socket.id });
    });

    // Accept call - User confirms they are available
    socket.on("accept-call", ({ to }) => {
      console.log(`User ${socket.id} accepted call from ${to}`);
      io.to(to).emit("call-accepted", { from: socket.id });
    });

    // Decline call
    socket.on("decline-call", ({ to }) => {
      console.log(`User ${socket.id} declined call from ${to}`);
      io.to(to).emit("call-declined", { from: socket.id });
    });

    // Send WebRTC offer to all users in the room (except sender)
    socket.on("offer", ({ offer }) => {
      const room = users[socket.id];
      if (!room) return;

      console.log(`User ${socket.id} is sending an offer to room ${room}`);

      socket.to(room).emit("offer", { from: socket.id, offer });
    });

    // Send answer to the offer
    socket.on("answer", ({ to, answer }) => {
      console.log(`User ${socket.id} sent an answer to ${to}`);
      io.to(to).emit("answer", { from: socket.id, answer });
    });

    // Forward ICE candidate to the correct peer
    socket.on("ice-candidate", ({ to, candidate }) => {
      console.log(`User ${socket.id} sent ICE candidate to ${to}`);
      io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("disconnect", () => {
      const room = users[socket.id];
      if (room) {
        socket.to(room).emit("user-disconnected", socket.id);
        delete users[socket.id];
      }
      console.log("User disconnected:", socket.id);
    });

    // socket.on("offer", (data) => {
    //   console.log("Offer received from:", socket.id);
    //   socket.to(data.to).emit("offer", {
    //     from: data.to,
    //     offer: data.offer,
    //   });
    // });

    // // Relay answer to the target peer
    // socket.on("answer", (data) => {
    //   console.log("Answer received from:", data.to);
    //   socket.to(data.to).emit("answer", {
    //     from: data.to,
    //     answer: data.answer,
    //   });
    // });

    // // Relay ICE candidates to the target peer
    // socket.on("ice-candidate", (data) => {
    //   console.log("ICE candidate received from:", data.to);
    //   socket.to(data.to).emit("ice-candidate", {
    //     from: data.to,
    //     candidate: data.candidate,
    //   });
    // });

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

    socket.on("send_message_ride_message", async (data) => {
      console.log("Received data:", data); // Debug the incoming data

      const { groupId, message, sender, uuid, user } = data;

      console.log(groupId, message, sender, uuid, user, "communication"); // Log the extracted values

      try {
        // Find the group in the database
        const group = await DriversMessage.findOne({ groupId: groupId });

        if (group) {
          group.messages.push({
            user: user,
            message: message,
            sender: sender,
            status: "delivered",
            timestamp: new Date(),
            uuid: uuid, // Save the UUID along with the message
          });

          await group.save();
          console.log(`Message from ${sender} saved to group ${groupId}`);

          // Emit the message to all users in the group
          io.to(groupId).emit("receive_message_ride_message", {
            sender: sender,
            message: message,
            uuid: uuid, // Emit the UUID back to the group
            timestamp: new Date().toISOString(),
            user: user,
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
        return console.error("No data received for acceptRide event.");
      }

      const { rideId, driverId } = payload;

      if (!rideId || !driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
        return console.error("Invalid data for acceptRide:", payload);
      }

      try {
        const rider = await Rider.findById(driverId);
        if (!rider) {
          return console.error(`No rider found with ID: ${driverId}`);
        }

        const updatedRideSocket = await RideSocket.findOneAndUpdate(
          { rideId },
          { status: "accepted" },
          { new: true }
        );
        if (!updatedRideSocket) {
          return console.error(`No RideSocket found for rideId: ${rideId}`);
        }

        const updatedRide = await RequestARide.findByIdAndUpdate(
          rideId,
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
              vehicleType: rider.vehicleType,
              vehicleName: rider.vehicleName,
              vehicleColor: rider.vehicleColor,
            },
          },
          { new: true }
        ).populate("customer.customerId"); // Populate customer to ensure all details are present

        if (!updatedRide) {
          return console.error(`No ride found with ID: ${rideId}`);
        }

        // Update recent delivery location for customer
        const customerUser = await User.findById(
          updatedRide.customer?.customerId
        );
        const latestDrop = updatedRide.deliveryDropoff?.[0];

        if (
          customerUser &&
          latestDrop &&
          customerUser.addRecentDeliveryLocation
        ) {
          customerUser.addRecentDeliveryLocation({
            address: latestDrop.deliveryAddress,
            latitude: latestDrop.deliveryLatitude,
            longitude: latestDrop.deliveryLongitude,
          });
          await customerUser.save();
          console.log("Customer recent delivery location updated.");
        }

        // Update receivingItems for each delivery in deliveryDropoff
        for (const delivery of updatedRide.deliveryDropoff || []) {
          // Only process deliveries that have a receiverUserId and the ride is not ended
          if (!delivery?.receiverUserId || updatedRide.endRide?.isEnded) {
            if (updatedRide.endRide?.isEnded) {
              console.log(
                `Skipping delivery for ride ${rideId} as it has ended.`
              );
            } else {
              console.warn(
                `Skipping delivery due to missing receiverUserId: ${JSON.stringify(
                  delivery
                )}`
              );
            }
            continue;
          }

          const receiverUser = await User.findById(delivery.receiverUserId);

          if (!receiverUser) {
            console.warn(
              `No receiver user found with ID: ${delivery.receiverUserId}. Skipping delivery update for this item.`
            );
            continue;
          }

          const customer = updatedRide.customer || {};
          const pickup = updatedRide.pickup || {};

          // Prepare receivingItemData ensuring all required fields are present and valid
          const receivingItemData = {
            rideId: updatedRide._id,
            deliveryCode:
              delivery.deliveryCode ||
              `GEN-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 5)
                .toUpperCase()}`, // Ensure a delivery code is always present
            deliveryLocation: {
              address: delivery.deliveryAddress || "",
              latitude: delivery.deliveryLatitude,
              longitude: delivery.deliveryLongitude,
            },
            pickup: {
              senderName:
                `${customer.firstName || ""} ${
                  customer.lastName || ""
                }`.trim() || "N/A",
              senderPhoneNumber: customer.phoneNumber || "N/A",
              pickupAddress: pickup.pickupAddress || "N/A",
            },
            rideStatus: { isEnded: updatedRide.endRide?.isEnded || false },
            createdAt: updatedRide.createdAt
              ? new Date(updatedRide.createdAt)
              : new Date(), // Ensure createdAt is a Date object
          };

          // Perform pre-validation check
          const isValid =
            receivingItemData.rideId &&
            receivingItemData.deliveryCode &&
            receivingItemData.createdAt instanceof Date &&
            receivingItemData.deliveryLocation.address &&
            typeof receivingItemData.deliveryLocation.latitude === "number" &&
            !isNaN(receivingItemData.deliveryLocation.latitude) &&
            typeof receivingItemData.deliveryLocation.longitude === "number" &&
            !isNaN(receivingItemData.deliveryLocation.longitude) &&
            receivingItemData.pickup.senderName &&
            receivingItemData.pickup.senderPhoneNumber &&
            receivingItemData.pickup.pickupAddress;

          if (!isValid) {
            console.error(
              "Invalid receivingItemData for user:",
              receiverUser._id,
              "Data:",
              receivingItemData
            );
            if (!receivingItemData.rideId) console.error("   - Missing rideId");
            if (!receivingItemData.deliveryCode)
              console.error("   - Missing deliveryCode");
            if (!(receivingItemData.createdAt instanceof Date))
              console.error("   - Missing or invalid createdAt");
            if (!receivingItemData.deliveryLocation.address)
              console.error("   - Missing deliveryLocation.address");
            if (
              !(
                typeof receivingItemData.deliveryLocation.latitude ===
                  "number" &&
                !isNaN(receivingItemData.deliveryLocation.latitude)
              )
            )
              console.error(
                "   - Missing or invalid deliveryLocation.latitude"
              );
            if (
              !(
                typeof receivingItemData.deliveryLocation.longitude ===
                  "number" &&
                !isNaN(receivingItemData.deliveryLocation.longitude)
              )
            )
              console.error(
                "   - Missing or invalid deliveryLocation.longitude"
              );
            if (!receivingItemData.pickup.senderName)
              console.error("   - Missing pickup.senderName");
            if (!receivingItemData.pickup.senderPhoneNumber)
              console.error("   - Missing pickup.senderPhoneNumber");
            if (!receivingItemData.pickup.pickupAddress)
              console.error("   - Missing pickup.pickupAddress");
            continue; // Skip this invalid entry
          }

          if (receiverUser.addReceivingItem) {
            receiverUser.addReceivingItem(receivingItemData);
            await receiverUser.save();
            console.log(
              `Receiver (${receiverUser._id}) receivingItems updated for delivery code: ${receivingItemData.deliveryCode}.`
            );

            const customerUserId = receiverUser?._id;
            if (customerUserId) {
              const actualReceiverUser = await User.findById(customerUserId);

              if (!actualReceiverUser) {
                console.warn(
                  `Actual receiver user with ID ${customerUserId} not found. Cannot send notifications.`
                );
                return;
              }

              const tokens = await DeviceToken.find({
                userId: actualReceiverUser._id.toString(),
              });

              if (tokens.length > 0) {
                const deviceTokens = tokens.map((t) => t.deviceToken);

                const { title, message, payload } = notificationTexts(
                  updatedRide
                ).incomingDelivery(
                  `${customer.firstName || ""} ${
                    customer.lastName || ""
                  }`.trim()
                );

                const receiverEmail = actualReceiverUser.email;

                // --- THIS IS THE CORRECTED PART ---
                // Generate the HTML content ONCE for this receiver
                const htmlEmailContent = await generateIncomingDispatch(
                  updatedRide,
                  actualReceiverUser._id.toString()
                );

                if (!htmlEmailContent) {
                  console.warn(
                    `Failed to generate HTML email content for user ${actualReceiverUser._id}. Email will not be sent.`
                  );
                }

                for (const token of deviceTokens) {
                  if (actualReceiverUser.pushNotifications) {
                    await sendCustomerPush(token, title, message, payload);
                    console.log(
                      `Push notification sent to device token: ${token} for user ${actualReceiverUser._id}.`
                    );
                  } else {
                    console.log(
                      `Push notifications disabled for user ${actualReceiverUser._id}. Skipping.`
                    );
                  }

                  // Send Email Notification
                  // Only proceed if HTML content was generated, receiverEmail exists,
                  // and the user has email notifications enabled.
                  if (
                    htmlEmailContent &&
                    receiverEmail &&
                    actualReceiverUser.emailNotifications
                  ) {
                    const emailSubject = "Your Pickars Delivery is On Its Way!";
                    const emailTextDescription = `Hi ${
                      actualReceiverUser.firstName || "there"
                    },\n\nYour delivery from ${customer.firstName || ""} ${
                      customer.lastName || ""
                    } is on its way to ${
                      receivingItemData.deliveryLocation.address
                    }.\n\nYour pickup code is: ${
                      receivingItemData.deliveryCode || "N/A"
                    }.\n\nTrack your delivery on the Pickars app.\n\nThank you for choosing Pickars!`;

                    await sendEmail(
                      receiverEmail,
                      emailSubject,
                      emailTextDescription,
                      htmlEmailContent // Pass the already generated HTML content
                    );
                    console.log(
                      `Email notification sent to ${receiverEmail} for user ${actualReceiverUser._id}.`
                    );
                  } else {
                    console.warn(
                      `Email not sent for user ${actualReceiverUser._id}: HTML content not generated, receiver email missing, or email notifications are disabled for this user.`
                    );
                  }
                }

                console.log(
                  `Notifications processing complete for user ${actualReceiverUser._id}`
                );
              } else {
                console.warn(
                  `No device tokens found for user ${customerUserId}. Push notification not sent.`
                );
              }
            } else {
              console.warn(
                "No customer userId found for notification purposes."
              );
            }
          } else {
            console.warn(
              `User method 'addReceivingItem' not found for user ${receiverUser._id}. Please define it on the User schema.`
            );
          }
        }

        // Create MessageSupport if it doesn't exist
        const existingMessageSupport = await MessageSupport.findOne({ rideId });
        if (!existingMessageSupport) {
          await new MessageSupport({
            rideId,
            userId: rider._id,
            messages: [],
          }).save();
          console.log("MessageSupport created.");
        }

        // Emit updated ride to all clients in room
        io.to(rideId).emit("rideBooked", {
          ride: updatedRide,
          rider,
          pairing: false,
          acceptRide: true,
          startRide: false,
          endRide: false,
          reportRide: false,
        });

        await notifyUsers(updatedRide, "acceptRide");

        console.log("acceptRide event completed.");
      } catch (err) {
        console.error("Error in acceptRide handler:", err.message);
      }
    });

    // ✅ START RIDE EVENT
    socket.on("startRide", async (payload) => {
      if (!payload) {
        console.error("No data received for startRide event.");
        return;
      }

      const { rideId, driverId, ride } = payload;
      if (!rideId || !driverId || !ride) {
        console.error("Invalid data received for startRide event.", payload);
        return;
      }

      try {
        const rider = await Rider.findById(driverId);
        if (!rider) {
          console.error(`No rider found with ID: ${driverId}`);
          return;
        }

        await RideSocket.findOneAndUpdate(
          { rideId },
          { status: "ongoing" },
          { new: true }
        );

        const updatedRide = await RequestARide.findByIdAndUpdate(
          rideId,
          { "startRide.isStarted": true, "startRide.timestamp": new Date() },
          { new: true }
        );

        if (!updatedRide) {
          console.error(`No ride found with ID: ${rideId}`);
          return;
        }

        io.to(rideId).emit("rideBooked", {
          ride: updatedRide,
          rider,
          pairing: false,
          startRide: true,
          endRide: false,
          reportRide: false,
          acceptRide: true,
        });

        console.log("✅ Start Ride Event Processed");

        // Notify Users (Customer + Receivers)
        await notifyUsers(updatedRide, "startRide");
      } catch (error) {
        console.error(
          `❌ Error processing startRide for ride ${rideId}:`,
          error.message
        );
      }
    });

    // ✅ END RIDE EVENT
    socket.on("endRide", async (payload) => {
      if (!payload) {
        console.error("No data received for endRide event.");
        return;
      }

      const { rideId, driverId, ride } = payload;
      const rideObject = ride?._id || rideId;

      if (!rideObject || !driverId) {
        console.error("Invalid data received for endRide event.", payload);
        return;
      }

      try {
        const rider = await Rider.findById(driverId);
        if (!rider) {
          console.error(`No rider found with ID: ${driverId}`);
          return;
        }

        await RideSocket.findOneAndDelete({ rideId: rideObject });

        const updatedRide = await RequestARide.findByIdAndUpdate(
          rideObject,
          { "endRide.isEnded": true, "endRide.timestamp": new Date() },
          { new: true }
        );

        if (!updatedRide) {
          console.error(`No ride found with ID: ${rideObject}`);
          return;
        }

        if (updatedRide.totalPrice) {
          await addRiderEarnings(driverId, updatedRide.totalPrice);
        }

        await removeReceivingItemsForRide(rideObject);

        io.to(rideObject.toString()).emit("rideBooked", {
          ride: updatedRide,
          rider,
          pairing: false,
          startRide: true,
          endRide: true,
          reportRide: false,
          acceptRide: true,
        });

        console.log("✅ End Ride Event Processed");

        // Notify Users (Customer + Receivers)
        await notifyUsers(updatedRide, "endRide");
      } catch (error) {
        console.error(
          `❌ Error processing endRide for ride ${rideObject}:`,
          error.message
        );
      }
    });

    socket.on("cancelRide", async (payload) => {
      if (!payload) {
        console.error("❌ No data received for cancelRide event.");
        return;
      }

      const { rideId, driverId } = payload;

      if (!rideId) {
        console.error(
          "❌ Invalid data received for cancelRide event.",
          payload
        );
        return;
      }

      try {
        const rideSocket = await RideSocket.findOne({ rideId });

        if (!rideSocket) {
          console.error(`❌ No RideSocket found for rideId: ${rideId}`);
          return;
        }

        let cancelledBy = "user"; // Default
        if (driverId && rideSocket.driverId === driverId) {
          cancelledBy = "driver";
        }

        // Update RideSocket status
        await RideSocket.findOneAndUpdate(
          { rideId },
          {
            status: "cancelled",
            cancelReason:
              cancelledBy === "driver"
                ? "Driver cancelled the ride"
                : "User requested to cancel",
            cancelledBy,
            cancelledAt: new Date(),
            cancelledById: driverId || rideSocket.ride?.customerId || null,
          },
          { new: true }
        );

        // Update main ride document
        const updatedRide = await RequestARide.findByIdAndUpdate(
          rideId,
          {
            "cancelRide.isCancelled": true,
            "cancelRide.timestamp": new Date(),
            "cancelRide.cancelledBy": cancelledBy,
          },
          { new: true }
        );

        if (!updatedRide) {
          console.error(
            `❌ No RequestARide document found for rideId: ${rideId}`
          );
          return;
        }

        // Remove receiving items related to this ride
        await removeReceivingItemsForRide(rideId);

        // Emit cancellation update to all clients in the ride room
        io.to(rideId.toString()).emit("rideBooked", {
          ride: updatedRide,
          pairing: false,
          startRide: false,
          endRide: false,
          reportRide: false,
          acceptRide: false,
          cancelRide: true,
        });

        console.log(`✅ Ride ${rideId} cancelled by ${cancelledBy}`);

        // ✅ Notify users about cancellation
      

        // ✅ Notify driver if the user cancelled the ride
        if (cancelledBy === "user" && rideSocket.driverId) {
         ;
          console.log(
            `✅ Driver ${rideSocket.driverId} notified about cancellation`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error processing cancelRide for ride ID: ${rideId}`,
          error.message
        );
      }
    });

    // This is a conceptual example for your backend code
    socket.on("joinRide", async (rideId) => {
      console.log("User joined ride:", rideId);
      try {
        const ride = await RequestARide.findById(rideId).populate(
          "rider.userId customer.customerId"
        );

        if (!ride) {
          console.log("No ride found with ID:", rideId);
          return;
        }

        const { pickupLatitude, pickupLongitude } = ride?.pickup || {};
        if (!pickupLatitude || !pickupLongitude) {
          console.log("Invalid pickup location for ride ID:", rideId);
          socket.emit("rideError", {
            message: "Invalid pickup location in ride details",
          });
          return;
        }

        socket.join(rideId);
        console.log("Socket joined room:", rideId);

        try {
          const closestRider = await Rider.findById("6777ce3701ac7202127a0e6e");
          if (!closestRider) {
            console.error("No rider found for ride ID:", rideId);
            socket.emit("joinedRide", {
              message: "No rider found",
              error: true,
            });
            return;
          }

          console.log("Closest rider found:", closestRider._id.toString());

          io.to(rideId).emit("rideBooked", {
            ride,
            rider: closestRider,
            pairing: true,
            startRide: ride?.startRide?.isStarted,
            acceptRide: ride?.acceptRide,
            endRide: false,
            reportRide: ride?.startRide?.reportRide,
          });
          console.log("Emitted 'rideBooked' to room:", rideId);

          io.to(closestRider._id.toString()).emit("riderJoined", {
            message: `Ride booked!`,
            rideDetails: closestRider,
            error: false,
            rideId,
            ride,
            driverId: closestRider._id.toString(),
            pickup: ride.pickup,
            deliveryDropoff: ride.deliveryDropoff,
            status: "pairing",
          });
          console.log(
            "Emitted 'riderJoined' to driver:",
            closestRider._id.toString()
          );

          // Define 'type' here as 'pickupAlert' since this is a new ride request
          const type = "pickupAlert"; // <--- FIX: 'type' is now defined here
          let title, message;

          if (type === "pickupAlert") {
            title = "New Pickup Request";
            message = `Pickup at ${capitalize(
              ride.pickup?.pickupAddress || "your location"
            )}`;
          } else if (type === "cancelRide") {
            title = "Ride Cancelled";
            message = `The customer has cancelled this ride.`;
          } else {
            console.log("Unknown push notification type, returning.");
            return;
          }

          const payload = {
            screen: "RideDetailsPage",
            params: { rideId: ride._id.toString(), type },
          };
          console.log("Push notification payload:", payload);

          const driverIdForPush = closestRider._id.toString();
          const tokens = await DriverDeviceToken.find({
            userId: driverIdForPush,
          });
          console.log(
            "Found device tokens for driver:",
            driverIdForPush,
            tokens.length
          );

          if (tokens.length === 0) {
            console.log(
              "No iOS device tokens found for driver:",
              driverIdForPush
            );
            return;
          }

          await Promise.all(
            tokens.map(({ deviceToken }) =>
              sendIOSPush(
                deviceToken,
                title,
                message,
                payload,
                process.env.DRIVER_BUNDLE_ID
              )
            )
          );
          console.log("Push notifications sent to driver:", driverIdForPush);

          const rideSocketData = new RideSocket({
            rideId,
            ride,
            driverId: closestRider._id.toString(),
            pickup: ride.pickup,
            deliveryDropoff: ride.deliveryDropoff,
            status: "pairing",
          });

          await rideSocketData.save();
          console.log(
            "RideSocket data saved successfully:",
            rideSocketData._id
          );
        } catch (error) {
          console.error(
            "Error in rider details or push notification logic:",
            error.message
          );
          socket.emit("joinedRide", {
            message:
              "An error occurred while fetching rider details or sending notification",
            error: true,
          });
        }
      } catch (error) {
        console.error("Error fetching ride details:", error);
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
