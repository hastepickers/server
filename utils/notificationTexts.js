const { capitalize } = require("./capitalize");

/**
 * Generates notification texts and payload for different ride states.
 * @param {object} ride - The ride object.
 * @returns {object} Object containing all ride notifications.
 */
function notificationTexts(ride) {
  const payload = {
    screen: "RideDetailsPage",
    params: { rideId: ride?._id.toString() },
  };

  return {
    acceptRide: {
      title: "Dispatch Accepted",
      message: `Our Dispatch Rider is heading to pick up your parcel and get it delivered shortly.`,
      payload,
    },

    startRide: {
      title: `Dispatch Started`,
      message: `Our Dispatch Rider has picked up your parcel. They are now starting deliveries to your recipients.`,
      payload,
    },

    endRide: {
      title: `Dispatch Completed`,
      message: `Thank you for using our service. We appreciate your trust in us. Your deliveries have been successfully completed.`,
      payload,
    },

    cancelRide: {
      title: "Ride Cancelled",
      message: `The ride has been cancelled. If you have any questions, please contact support.`,
      payload,
    },

    incomingDelivery: (customerName) => ({
      title: `Dispatch Incoming`,
      message: `Incoming Dispatch from ${capitalize(
        customerName
      )}, our Dispatch Rider is heading to pick up your parcel. They will deliver it to you shortly.`,
      payload,
    }),
  };
}

module.exports = { notificationTexts };
