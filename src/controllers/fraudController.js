const Order = require("../config/models/Order");
const User = require("../config/models/User");
const FraudLogs = require("../config/models/FraudLogs");

exports.getSuspiciousOrders = async (req, res) => {
    try {
        const orders = await Order.find({ isSuspicious: true })
            .populate("user", "name email isRestricted")
            .populate("restaurant", "name")
            .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            count: orders.length,
            data: orders,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.approveSuspiciousOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        order.isSuspicious = false;
        order.fraudReason = "";
        await order.save();

        await FraudLogs.findOneAndUpdate(
            { order: order._id },
            {
                action: "approved",
                reviewedBy: req.user._id,
            },
            { sort: { createdAt: -1 } }
        );

        return res.status(200).json({
            success: true,
            message: "Suspicious order approved",
            data: order,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.rejectSuspiciousOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        order.orderStatus = "rejected";
        order.isSuspicious = true;
        await order.save();

        await FraudLogs.findOneAndUpdate(
            { order: order._id },
            {
                action: "rejected",
                reviewedBy: req.user._id,
            },
            { sort: { createdAt: -1 } }
        );

        return res.status(200).json({
            success: true,
            message: "Suspicious order rejected",
            data: order,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.restrictUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        user.isRestricted = true;
        user.isBlocked = true;
        await user.save();

        await FraudLogs.create({
            user: user._id,
            order: req.body.orderId || null,
            riskScore: req.body.riskScore || 0,
            fraudReason: req.body.fraudReason || "User restricted by admin",
            action: "restricted",
            reviewedBy: req.user._id,
        });

        return res.status(200).json({
            success: true,
            message: "User restricted successfully",
            data: user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
