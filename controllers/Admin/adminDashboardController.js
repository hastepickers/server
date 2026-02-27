const RequestARide = require("../../models/Customer/RequestARideSchema");
const User = require("../../models/Customer/User");
const Earnings = require("../../models/Rider/RiderEarnings");
const Rider = require("../../models/Rider/RiderSchema");

exports.getDashboardStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      totalRiders,
      totalRides,
      completedRides,
      totalRevenueAgg,
      totalEarningsAgg,
      dailyStatsAgg, // --- NEW CHART DATA AGGREGATION ---
    ] = await Promise.all([
      User.countDocuments(),
      Rider.countDocuments(),
      RequestARide.countDocuments(),
      RequestARide.countDocuments({ "endRide.isEnded": true }),
      RequestARide.aggregate([
        { $match: { "paid.isPaid": true } },
        { $group: { _id: null, total: { $sum: "$paid.details.amount" } } },
      ]),
      Earnings.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // 🔥 Generate Chart Data: Group Revenue & Rides by Date for the last 7 days
      RequestARide.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
            "paid.isPaid": true,
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$paid.details.amount" },
            rides: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Format chart data for frontend consumption (Labels and Datasets)
    const chartData = {
      labels: dailyStatsAgg.map((item) => item._id),
      revenueData: dailyStatsAgg.map((item) => item.revenue / 100), // Assuming kobo to Naira/Main unit
      ridesData: dailyStatsAgg.map((item) => item.rides),
    };

    res.status(200).json({
      stats: {
        users: totalUsers,
        riders: totalRiders,
        rides: totalRides,
        completedRides,
        totalRevenue: totalRevenueAgg[0]?.total || 0,
        totalRiderEarnings: totalEarningsAgg[0]?.total || 0,
      },
      chartData, // ✅ Return this to populate your line/bar charts
    });
  } catch (error) {
    console.error("🔥 Dashboard Stats Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllRiders = async (req, res) => {
  try {
    const riders = await Rider.find()
      .populate("earnings")
      .populate("withdrawals")
      .sort({ createdAt: -1 });
    res.status(200).json({ count: riders.length, riders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllRides = async (req, res) => {
  try {
    const rides = await RequestARide.find()
      .populate(
        "customer.customerId",
        "firstName lastName phoneNumber imageUrl"
      )
      .populate("rider.userId", "firstName lastName plateNumber")
      .sort({ createdAt: -1 });
    res.status(200).json({ count: rides.length, rides });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const payments = await RequestARide.find(
      { "paid.isPaid": true },
      {
        paid: 1,
        customer: 1,
        trackingId: 1,
        totalPrice: 1,
        createdAt: 1,
      }
    ).sort({ "paid.timestamp": -1 });

    res.status(200).json({ count: payments.length, payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
