//Create a new Request a Ride

const RequestARide = require("../../models/Customer/RequestARideSchema");
const User = require("../../models/Customer/User");
const Rider = require("../../models/Rider/RiderSchema");
const mongoose = require("mongoose");
const TypeOfVehicle = require("../../models/Admin/TypeOfVehicleSchema");
const RideSocket = require("../../models/Rider/RideSocket");
const { v4: uuidv4 } = require("uuid");

// Helper to generate pickup or delivery code
function generateCustomCode(prefix = "USER") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix.split(" ")[0]}-${code}`.toUpperCase();
}

// Helper function to calculate distance between two lat/lng points in km
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (angle) => (angle * Math.PI) / 180;

  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Controller to calculate total distance from pickup to multiple deliveries
// Controller to calculate total distance from pickup to multiple deliveries
exports.calculateTotalDistance = async (req, res) => {
  try {
    let { pickupLat, pickupLng, deliveryPoints } = req.body;

    console.log("Raw Input:", { pickupLat, pickupLng, deliveryPoints });

    // Ensure pickup coordinates are numbers
    pickupLat =
      typeof pickupLat === "string" ? parseFloat(pickupLat) : pickupLat;
    pickupLng =
      typeof pickupLng === "string" ? parseFloat(pickupLng) : pickupLng;

    if (
      typeof pickupLat !== "number" ||
      typeof pickupLng !== "number" ||
      !Array.isArray(deliveryPoints)
    ) {
      return res.status(400).json({ message: "Invalid input", success: false });
    }

    // Normalize delivery points
    deliveryPoints = deliveryPoints.map((point, index) => {
      // Use lat/lng or fallback to deliveryLatitude/Longitude
      let lat = point.lat ?? point.deliveryLatitude;
      let lng = point.lng ?? point.deliveryLongitude;

      // Convert to numbers if they're strings
      lat = typeof lat === "string" ? parseFloat(lat) : lat;
      lng = typeof lng === "string" ? parseFloat(lng) : lng;

      console.log(`Delivery Point ${index + 1}:`, { lat, lng });

      if (typeof lat !== "number" || typeof lng !== "number") {
        throw new Error(`Invalid lat/lng at delivery point ${index + 1}`);
      }

      return { lat, lng };
    });

    // Calculate total distance
    let totalDistance = 0;
    for (const point of deliveryPoints) {
      totalDistance += haversineDistance(
        pickupLat,
        pickupLng,
        point.lat,
        point.lng
      );
    }

    // Pricing logic
    const baseRatePerKm = 100;

    const regularPriceBeforeDiscount = totalDistance * baseRatePerKm;
    const regularDiscountPercent = 10;
    const regularFinalPrice =
      regularPriceBeforeDiscount * (1 - regularDiscountPercent / 100);

    const impromptuPriceBeforeDiscount = totalDistance * baseRatePerKm * 2;
    const impromptuDiscountPercent = 0;
    const impromptuFinalPrice = impromptuPriceBeforeDiscount;

    // Return hardcoded example pricing
    const choices = [
      {
        id: "regular",
        title: "Regular",
        type: "bike",
        priceBeforeDiscount: 3500,
        discountPercent: 15,
        price: 2500,
        off: 525,
        description: "Standard delivery with 15% discount.",
      },
      {
        id: "premium",
        title: "Impromptu",
        type: "bike",
        priceBeforeDiscount: 8000,
        discountPercent: 5,
        price: 5000,
        off: 400,
        description: "Urgent delivery with 5% discount.",
      },
      {
        id: "insured",
        title: "Insured",
        type: "bike",
        priceBeforeDiscount: 12000,
        discountPercent: 0,
        price: 12000,
        off: 0,
        description: "Delivery with full insurance coverage at ₦12,000.",
      },
    ];

    return res.status(200).json({
      totalDistanceInKm: totalDistance,
      choices,
      message: "Total distance and delivery options calculated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error in calculateTotalDistance:", error);
    return res.status(500).json({ message: error.message, success: false });
  }
};
// Create a new Request a Ride
exports.createRide = async (req, res) => {
  try {
    // Extract the customer ID from the token
    const customerId = req.user.id; // ID decoded from the token in middleware

    // Fetch the customer details from the User model
    const customer = await User.findById(customerId).select(
      "firstName lastName phoneNumber imageUrl email"
    );
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const { deliveryDropoff, pickup, arrivalTime, typeOfVehicleId } = req.body;

    // Fetch the type of vehicle details from the TypeOfVehicle model
    const typeOfVehicle = await TypeOfVehicle.findById(typeOfVehicleId);
    if (!typeOfVehicle) {
      return res.status(404).json({ message: "Type of vehicle not found" });
    }

    // Create the new ride with populated customer details
    const newRide = new RequestARide({
      deliveryDropoff,
      pickup,
      arrivalTime,
      typeOfVehicle: {
        id: typeOfVehicle._id,
        name: typeOfVehicle.name,
        logoUrl: typeOfVehicle.logoUrl,
        type: typeOfVehicle.type,
        company: typeOfVehicle.company,
        active: typeOfVehicle.active,
        ridersId: typeOfVehicle.ridersId,
        timeAdded: typeOfVehicle.timeAdded,
        plateNumber: typeOfVehicle.plateNumber,
      },
      customer: {
        userId: customer._id, // This is the userId required by the schema
        firstName: customer.firstName,
        lastName: customer.lastName,
        phoneNumber: customer.phoneNumber,
        imageUrl: customer.imageUrl,
        email: customer.email,
      },
      trackingId: generateUUID(), // Function to generate a 12-char unique tracking ID
    });

    await newRide.save();
    res
      .status(201)
      .json({ message: "Ride request created successfully", newRide });
  } catch (error) {
    console.error("Error creating ride request:", error); // Log the error
    res.status(500).json({ message: "Error creating ride request", error });
  }
};

exports.cancelRideById = async (req, res) => {
  try {
    const { rideId } = req.params; // Retrieve ride ID from request parameters
    console.log("Ride canceled successfully:", rideId);
    // Find the ride by its ID
    const ride = await RequestARide.findById(rideId);

    if (!ride) {
      return res
        .status(404)
        .json({ message: "Ride not found", success: false });
    }

    // Check if the ride is already cancelled
    if (ride.cancelRide.isCancelled) {
      return res.status(200).json({
        message: "Ride cancelled successfully",
        ride: ride,
        success: true,
      });
    }

    // Update the ride's cancel status
    ride.cancelRide.isCancelled = true;
    ride.cancelRide.timestamp = new Date();

    // Save the updated ride
    await ride.save();

    // Respond with success message
    res.status(200).json({
      message: "Ride cancelled successfully",
      ride: ride,
      success: true,
    });
  } catch (error) {
    console.error("Error cancelling the ride:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
};

exports.bookARide = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch customer
    const customer = await User.findById(userId).select(
      "firstName lastName phoneNumber imageUrl email"
    );
    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    // 2. Extract and validate body
    const { deliveryDropoff, pickup, typeOfVehicle, totalPrice } = req.body;

    if (!Array.isArray(deliveryDropoff) || deliveryDropoff.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one delivery drop-off point is required." });
    }

    if (
      !pickup ||
      !pickup.pickupLatitude ||
      !pickup.pickupLongitude ||
      !pickup.pickupAddress
    ) {
      return res
        .status(400)
        .json({ message: "Pickup location details are required." });
    }

    // 3. Generate pickupCode
    const pickupCode = generateCustomCode(customer.firstName);

    // 4. Clean and normalize delivery drop-offs (remove any incoming id)
    const cleanedDropoffs = deliveryDropoff.map((drop, index) => {
      if (
        !drop.deliveryLatitude ||
        !drop.deliveryLongitude ||
        !drop.deliveryAddress ||
        !drop.receiverName ||
        !drop.receiverPhoneNumber
      ) {
        throw new Error(
          `Delivery drop-off ${index + 1} is missing required fields.`
        );
      }

      return {
        deliveryLatitude: drop.deliveryLatitude,
        deliveryLongitude: drop.deliveryLongitude,
        deliveryAddress: drop.deliveryAddress,
        receiverName: drop.receiverName,
        receiverPhoneNumber: drop.receiverPhoneNumber,
        receiverUserId:
          drop.receiverUserId && drop.receiverUserId !== ""
            ? drop.receiverUserId
            : undefined,
        items: Array.isArray(drop.items) ? drop.items : [],
        parcelId: uuidv4().split("-")[0].toUpperCase(), // Short unique code for package
        deliveryCode: pickupCode, // Same as pickup code for tracking
      };
    });

    // 5. Clean pickup object (remove id if present)
    const cleanedPickup = {
      pickupLatitude: pickup.pickupLatitude,
      pickupLongitude: pickup.pickupLongitude,
      pickupAddress: pickup.pickupAddress,
      pickupCode: pickupCode,
    };

    // 6. Build new ride request object
    const newRideRequest = new RequestARide({
      deliveryDropoff: cleanedDropoffs,
      pickup: cleanedPickup,
      typeOfVehicle,
      totalPrice,
      customer: {
        customerId: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phoneNumber: customer.phoneNumber,
        imageUrl: customer.imageUrl,
        email: customer.email,
      },
    });

    // 7. Save to DB
    await newRideRequest.save();

    return res.status(201).json({
      message: "Ride request booked successfully",
      rideRequest: newRideRequest,
      success: true,
    });
  } catch (error) {
    console.error("❌ Error booking ride request:", error);
    return res.status(500).json({
      message: "Error booking ride request",
      error: error.message,
    });
  }
};
exports.acceptRide = async (req, res) => {
  try {
    const { rideId } = req.params; // Ride ID from the URL
    console.log(rideId, "ride ID received");

    // Extract rider details from the request body
    const {
      userId,
      firstName,
      lastName,
      plateNumber,
      imageUrl,
      phoneNumber,
      driverRating,
      ridersLatitude,
      ridersLongitude,
      ridersAddress,
    } = req.body;

    // Basic validation to ensure required fields are passed
    if (
      !userId ||
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !ridersLatitude ||
      !ridersLongitude ||
      !ridersAddress
    ) {
      return res
        .status(400)
        .json({ message: "Missing required rider details" });
    }

    // Convert userId to ObjectId using new mongoose.Types.ObjectId()
    const riderUserId = new mongoose.Types.ObjectId(userId);

    // Find and update the ride by ID
    const ride = await RequestARide.findByIdAndUpdate(
      rideId,
      {
        rider: {
          userId: riderUserId, // Ensure userId is valid ObjectId
          firstName,
          lastName,
          plateNumber,
          imageUrl,
          phoneNumber,
          driverRating: {
            rating: driverRating?.rating || 0,
            numberOfReviews: driverRating?.numberOfReviews || 0,
          },
          riderLocation: {
            ridersLatitude,
            ridersLongitude,
            ridersAddress,
          },
        },
        acceptRide: true, // Toggle acceptRide to true
      },
      { new: true } // Ensure the updated ride document is returned
    );

    // If the ride doesn't exist, return a 404 error
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Respond with success and updated ride details
    res.status(200).json({
      message: "Ride accepted successfully",
      rideDetails: ride,
    });
  } catch (error) {
    // Handle errors and log them
    console.error("Error accepting ride:", error);
    res
      .status(500)
      .json({ message: "Error accepting ride", error: error.message });
  }
};

exports.getRideById = async (req, res) => {
  try {
    const ride = await RequestARide.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const formatPhone = (phone) => {
      if (!phone) return null;
      const trimmed = phone.toString().trim();
      if (trimmed.startsWith("0")) return trimmed;
      if (trimmed.startsWith("+234")) return trimmed;
      return `+234${trimmed}`;
    };

    // Format customer phone
    if (ride.customer && ride.customer.phoneNumber) {
      ride.customer.phoneNumber = formatPhone(ride.customer.phoneNumber);
    }

    // Format rider phone
    if (ride.rider && ride.rider.phoneNumber) {
      ride.rider.phoneNumber = formatPhone(ride.rider.phoneNumber);
    }

    // Format all deliveryDropoff receiver phone numbers
    if (Array.isArray(ride.deliveryDropoff)) {
      ride.deliveryDropoff = ride.deliveryDropoff.map((drop) => {
        if (drop.receiverPhoneNumber) {
          drop.receiverPhoneNumber = formatPhone(drop.receiverPhoneNumber);
        }
        return drop;
      });
    }

    console.log(ride, "📦 Fetched ride with formatted phone numbers");

    res.status(200).json(ride);
  } catch (error) {
    console.error("❌ Error fetching ride:", error);
    res.status(500).json({
      message: "Error fetching ride details",
      error: error.message,
    });
  }
};

exports.updateRideStatus = async (req, res) => {
  try {
    const ride = await RequestARide.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const { action, timestamp, paymentMethod } = req.body;

    // Update based on the action type
    switch (action) {
      case "acceptRide":
        ride.acceptRide = true;
        break;
      case "cancelRide":
        ride.cancelRide.isCancelled = true;
        ride.cancelRide.timestamp = timestamp || new Date();
        break;
      case "startRide":
        ride.startRide.isStarted = true;
        ride.startRide.timestamp = timestamp || new Date();
        break;
      case "endRide":
        ride.endRide.isEnded = true;
        ride.endRide.timestamp = timestamp || new Date();
        break;
      case "paid":
        ride.paid.isPaid = true;
        ride.paid.timestamp = timestamp || new Date();
        ride.paid.paymentMethod = paymentMethod;
        break;
      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    await ride.save();
    res.status(200).json({ message: "Ride status updated successfully", ride });
  } catch (error) {
    res.status(500).json({ message: "Error updating ride status", error });
  }
};

exports.getCompletedRides = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch rides with 'isEnded' set to true and customerId matching the user ID
    const completedRides = await RequestARide.find({
      "customer.customerId": userId,
      "endRide.isEnded": true,
    });

    if (!completedRides.length) {
      return res
        .status(404)
        .json({ message: "No completed rides found for this user" });
    }

    // Return the completed rides
    return res.status(200).json({ completedRides });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const generateUUID = () => {
  return "xxxxxxxxxxxx".replace(/[x]/g, () =>
    ((Math.random() * 36) | 0).toString(36)
  );
};

exports.getRidesByCustomerId = async (req, res) => {
  const customerId = req.user.id; // Get user ID from JWT
  console.log(customerId, "customerIdcustomerId");

  try {
    // Make sure customerId is a valid ObjectId
    const rides = await RequestARide.find({
      "customer.customerId": new mongoose.Types.ObjectId(customerId), // Use `new` to instantiate ObjectId
    }).select(
      "pickup endRide cancelRide startRide totalPrice _id createdAt deliveryDropoff"
    ); // Select only the necessary fields

    if (!rides || rides.length === 0) {
      return res
        .status(404)
        .json({ message: "No rides found for this customer" });
    }

    // Reverse the rides array to put the last item first
    rides.reverse();

    res.status(200).json({ rides, success: true });
  } catch (error) {
    console.error("Error fetching rides by customerId:", error); // Log error
    res
      .status(500)
      .json({ message: "Error fetching rides by customerId", error });
  }
};

exports.getRideSocketLogs = async (req, res) => {
  try {
    const driverId = req.user.id;

    // Validate input
    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is required" });
    }

    // Query the database for rides matching the criteria
    const rideSockets = await RideSocket.find(
      { driverId, status: "pairing" }, // Filters
      { rideId: 1, pickup: 1, _id: 0 } // Fields to return
    );

    if (rideSockets.length === 0) {
      return res
        .status(404)
        .json({ message: "No matching ride sockets found" });
    }

    // Respond with the filtered data
    res.status(200).json(rideSockets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getRidesByRiderId = async (req, res) => {
  const { riderId } = req.params; // Get the riderId from the route params

  try {
    const rides = await RequestARide.find({ "rider.riderId": riderId });
    if (!rides || rides.length === 0) {
      return res.status(404).json({ message: "No rides found for this rider" });
    }
    res.status(200).json(rides);
  } catch (error) {
    console.error("Error fetching rides by riderId:", error); // Log error
    res.status(500).json({ message: "Error fetching rides by riderId", error });
  }
};

exports.getRidesOngoingForCustomer = async (req, res) => {
  console.log("\n===============================");
  console.log("🚀 getRidesOngoingForCustomer triggered");
  console.log("===============================\n");

  try {
    const customerId = req.user?.id;

    console.log("👉 Extracted customerId:", customerId);
    console.log("👉 Full req.user:", req.user);

    if (!customerId) {
      console.log("❌ No customerId found in token");
      return res.status(400).json({ message: "Invalid customer." });
    }

    const query = {
      "customer.customerId": new mongoose.Types.ObjectId(customerId),
      acceptRide: true,
      //      "startRide.isStarted": true,
      "endRide.isEnded": false,
      "cancelRide.isCancelled": false,
    };

    console.log("\n📌 Query being sent to MongoDB:");
    console.log(query);

    const rides = await RequestARide.find(query)
      .select(
        "pickup customer deliveryDropoff paid endRide typeOfVehicle cancelRide startRide totalPrice _id createdAt rider"
      )
      .lean();

    console.log("\n📦 Raw rides result from DB:");
    console.log(JSON.stringify(rides, null, 2));
    console.log("👉 Number of rides found:", rides?.length);

    if (!rides || rides.length === 0) {
      console.log("⚠️ No rides matched the query.");
      return res
        .status(404)
        .json({ message: "No rides found for this customer." });
    }

    console.log("✅ Sending successful response.\n");

    res.status(200).json({ rides, success: true });
  } catch (error) {
    console.error("\n❌ ERROR in getRidesOngoingForCustomer:");
    console.error(error);
    res.status(500).json({
      message: "Error fetching rides by customerId",
      error: error.message,
    });
  }
};

exports.rateRider = async (req, res) => {
  const { riderId } = req.params; // Assuming the rideId is passed in the route
  const { rating, rideId } = req.body;

  // Validate the input rating
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      error: "Rating must be a number between 1 and 5.",
    });
  }

  try {
    // Find the rider by ID
    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ error: "Rider not found." });
    }

    // Fetch the current rating and number of reviews
    const previousRating = rider.driverRating.rating || 0;
    const numberOfReviews = rider.driverRating.numberOfReviews || 0;

    // Calculate the new average rating
    const newRating =
      numberOfReviews === 0
        ? rating
        : (previousRating * numberOfReviews + rating) / (numberOfReviews + 1);

    // Update the rider's rating
    rider.driverRating.rating = parseFloat(newRating.toFixed(2)); // Rounded to 2 decimal places
    rider.driverRating.numberOfReviews = numberOfReviews + 1;

    // Save the updated rider
    await rider.save();

    // Now, find the ride by the rideId and toggle the isRated field
    const ride = await RequestARide.findById(rideId); // Or use another way to identify the ride
    if (!ride) {
      return res.status(404).json({ error: "Ride not found.", success: false });
    }

    // Toggle isRated to true
    ride.isRated = true;
    await ride.save();

    return res.status(200).json({
      message: "Rating updated and ride marked as rated successfully.",
      rider: {
        id: rider._id,
        firstName: rider.firstName,
        lastName: rider.lastName,
        driverRating: rider.driverRating,
      },
      ride: {
        id: ride._id,
        isRated: ride.isRated,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error updating rider rating:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred while rating the rider.",
    });
  }
};
