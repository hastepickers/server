const { sendDriverPush } = require("../../utils/sendIOSPush");
const { capitalize } = require("../../utils/capitalize");
const DriverDeviceToken = require("../../models/DriverDeviceToken");
const Rider = require("../../models/Rider/RiderSchema");

const notifyDriver = async (ride, type, driverId) => {
  try {
    if (!ride || !driverId) return;

    const driver = await Rider.findById(driverId);
    if (!driver) return;

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
      return;
    }

    const payload = {
      screen: "RideDetailsPage",
      params: { rideId: ride._id.toString(), type },
    };

    const tokens = await DriverDeviceToken.find({
      userId: driverId,
    });
    if (tokens.length === 0) return;

    console.log(deviceToken, 'deviceTokendeviceToken')
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
  } catch (error) {
    console.error(`Error in notifyDriver (${type}):`, error.message);
  }
};

module.exports = notifyDriver;
