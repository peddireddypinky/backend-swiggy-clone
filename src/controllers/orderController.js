const Order = require("../config/models/Order");
const Cart = require("../config/models/Cart");
const Restaurant = require("../config/models/restaurant");
const FraudLogs = require("../config/models/FraudLogs");
const { buildFraudScore } = require("../services/fraudService");

exports.createOrder = async (req, res) => {
    try {
        if (req.user.isRestricted) {
            return res.status(403).json({
                success: false,
                message: "Your account is restricted by admin",
            });
        }

        const { deliveryAddress, couponCode } = req.body;
        if (!deliveryAddress) {
            return res.status(400).json({
                success: false,
                message: "deliveryAddress is required",
            });
        }

        const cart = await Cart.findOne({ user: req.user._id })
            .populate("items.menuItem")
            .populate("restaurant");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty",
            });
        }
        if (!cart.restaurant.isApproved) {
            return res.status(400).json({
                success: false,
                message: "Restaurant is not approved yet. Please try again later.",
            });
        }
        const items = cart.items.map((item) => ({
            menuItem: item.menuItem._id,
            quantity: item.quantity,
            name: item.menuItem.name,
            price: item.menuItem.price,
        }));
        const totalPrice = items.reduce(
            (total, item) => total + item.price * item.quantity,
            0,
        );
        const order = await Order.create({
            user: req.user._id,
            restaurant: cart.restaurant._id,
            items,
            totalAmount: totalPrice,
            deliveryAddress,
            couponCode: couponCode || null,
        });

        const fraudAssessment = await buildFraudScore({
            userId: req.user._id,
            couponCode: couponCode || null,
        });
        order.riskScore = fraudAssessment.riskScore;
        order.isSuspicious = fraudAssessment.isSuspicious;
        order.fraudReason = fraudAssessment.fraudReason;
        await order.save();

        if (fraudAssessment.isSuspicious) {
            await FraudLogs.create({
                user: req.user._id,
                order: order._id,
                riskScore: fraudAssessment.riskScore,
                fraudReason: fraudAssessment.fraudReason,
                action: "flagged",
            });
        }

        await Cart.findOneAndDelete({ user: req.user._id });
        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            data: order,
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

exports.placeOrder = exports.createOrder;

exports.cancelOrder = async (req, res) => {
    try {
        if (req.user.isRestricted) {
            return res.status(403).json({
                success: false,
                message: "Your account is restricted by admin",
            });
        }

        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can cancel only your own orders",
            });
        }

        if (order.orderStatus === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Order is already cancelled",
            });
        }

        order.orderStatus = "cancelled";

        const fraudAssessment = await buildFraudScore({
            userId: req.user._id,
            couponCode: order.couponCode,
        });
        order.riskScore = fraudAssessment.riskScore;
        order.isSuspicious = fraudAssessment.isSuspicious;
        order.fraudReason = fraudAssessment.fraudReason;
        await order.save();

        if (fraudAssessment.isSuspicious) {
            await FraudLogs.create({
                user: req.user._id,
                order: order._id,
                riskScore: fraudAssessment.riskScore,
                fraudReason: fraudAssessment.fraudReason,
                action: "flagged",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data: order,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.mockPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "orderId is required",
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // Match schema field names and enum values
        order.paymentStatus = "paid";
        order.orderStatus = "confirmed";
        await order.save();

        return res.status(200).json({
            success: true,
            message: "mock payment successful",
            data: order,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error verifying mock payment",
            error: error.message,
        });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate("restaurant",
            );
        res.status(200).json({
            success: true,
            data: orders,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getRestaurantOrders = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user._id });
        if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
        
        const orders = await Order.find({ restaurant: restaurant._id })
            .populate("user", "name email")
            .sort({ createdAt: -1 });
            
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const order = await Order.findById(id).populate("restaurant");
        
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        
        order.orderStatus = status;
        await order.save();
        res.status(200).json({ success: true, message: 'Order status updated', data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
