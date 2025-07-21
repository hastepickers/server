/**
 * Remove the given ride from all users' receivingItems array
 * @param {String} rideId
 */
const removeReceivingItemsForRide = async (rideId) => {
  try {
    if (!rideId) {
      console.warn("removeReceivingItemsForRide called without rideId");
      return;
    }

    const result = await User.updateMany(
      { "receivingItems.rideId": rideId }, // Find users who have this ride in their receiving list
      { $pull: { receivingItems: { rideId: rideId } } } // Remove it
    );

    console.log(
      `✅ Removed ride ${rideId} from receivingItems for ${result.modifiedCount} users`
    );
  } catch (error) {
    console.error(
      `❌ Error removing receivingItems for ride ${rideId}:`,
      error.message
    );
  }
};
