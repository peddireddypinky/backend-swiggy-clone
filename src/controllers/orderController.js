const Order = require("../config/models/Order");
const Cart = require("../config/models/Cart");
const Restaurant = require("../config/models/restaurant");
const FraudLogs = require("../config/models/FraudLogs");
const SurgeSetting = require("../config/models/SurgeSetting");
const { buildFraudScore } = require("../services/fraudService");
const {
    assignPartnerToOrder,
    releasePartnerFromOrder,
    getRestaurantCoordinates,
} = require("../services/deliveryAssignmentService");
const DeliveryPartner = require("../config/models/DeliveryPartner");
const mongoose = require("mongoose");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseTimeToMinutes = (hhmm) => {
    if (typeof hhmm !== "string") return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
};

const isNowInPeakHours = (peakHours = [], now = new Date()) => {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    for (const window of peakHours) {
        const start = parseTimeToMinutes(window?.start);
        const end = parseTimeToMinutes(window?.end);
        if (start === null || end === null) continue;

        // supports windows that cross midnight
        if (start <= end) {
            if (nowMinutes >= start && nowMinutes <= end) return true;
        } else {
            if (nowMinutes >= start || nowMinutes <= end) return true;
        }
    }
    return false;
};

const getActiveOrderVolumeForRegion = async (region, windowMinutes = 30) => {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const activeStatuses = ["pending", "accepted", "preparing", "out_for_delivery"];

    const result = await Order.aggregate([
        {
            $match: {
                region,
                createdAt: { $gte: since },
                orderStatus: { $in: activeStatuses },
            },
        },
        { $group: { _id: null, count: { $sum: 1 } } },
    ]);

    return result?.[0]?.count ?? 0;
};

const calculateSurge = async ({ region, now = new Date() }) => {
    const setting =
        (await SurgeSetting.findOne({ region })) ||
        (await SurgeSetting.findOne({ region: "default" }));

    const baseDeliveryFee = setting?.baseDeliveryFee ?? 30;
    const peakMultiplier = setting?.surgeMultiplier ?? 1.5;
    const demandThreshold = setting?.demandThreshold ?? 25;
    const peakHours = setting?.peakHours ?? [];

    const isPeak = isNowInPeakHours(peakHours, now);
    const activeOrderVolume = await getActiveOrderVolumeForRegion(region, 30);
    const isHighDemand = activeOrderVolume >= demandThreshold;

    let surgeMultiplier = 1;
    if (isPeak) surgeMultiplier = Math.max(surgeMultiplier, peakMultiplier);
    if (isHighDemand) surgeMultiplier = Math.max(surgeMultiplier, 2);

    const deliveryFee = Math.round(baseDeliveryFee * surgeMultiplier);

    return {
        region,
        baseDeliveryFee,
        surgeMultiplier,
        deliveryFee,
        demandThreshold,
        activeOrderVolume,
        isPeak,
        isHighDemand,
        peakHours,
        settingId: setting?._id ?? null,
    };
};

exports.calculateDeliveryFee = async (req, res) => {
    try {
        const { region } = req.body;
        if (!region || typeof region !== "string" || !region.trim()) {
            return res.status(400).json({
                success: false,
                message: "region is required",
            });
        }

        const regionValue = region.trim();
        const result = await calculateSurge({ region: regionValue, now: new Date() });

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.createOrder = async (req, res) => {
    try {
        if (req.user.isRestricted) {
            return res.status(403).json({
                success: false,
                message: "Your account is restricted by admin",
            });
        }

        const { deliveryAddress, couponCode, region } = req.body;
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

        const regionValue =
            (typeof region === "string" && region.trim()
                ? region.trim()
                : cart.restaurant.city) || "default";

        const pricing = await calculateSurge({ region: regionValue, now: new Date() });

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
            region: regionValue,
            deliveryFee: pricing.deliveryFee,
            surgeMultiplier: pricing.surgeMultiplier,
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

        const restaurantCoordinates = getRestaurantCoordinates(cart.restaurant);
        let assignmentMessage = null;
        if (restaurantCoordinates) {
            const assignment = await assignPartnerToOrder(order, restaurantCoordinates);
            if (!assignment.assigned) {
                assignmentMessage = "No available delivery partners found";
            }
        } else {
            assignmentMessage = "Restaurant location not configured for partner assignment";
        }

        await Cart.findOneAndDelete({ user: req.user._id });

        const populatedOrder = await Order.findById(order._id)
            .populate(
                "assignedDeliveryPartner",
                "name phone isAvailable activeDeliveries currentLocation"
            );

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            ...(assignmentMessage ? { assignmentMessage } : {}),
            data: populatedOrder,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
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
        if (!isValidObjectId(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order id",
            });
        }

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

        if (order.assignedDeliveryPartner) {
            await releasePartnerFromOrder(order.assignedDeliveryPartner);
            order.assignedDeliveryPartner = null;
        }

        order.orderStatus = "cancelled";
        // Persist current cancellation before recalculating user fraud score.
        await order.save();

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

exports.requestRefund = async (req, res) => {
    try {
        if (req.user.isRestricted) {
            return res.status(403).json({
                success: false,
                message: "Your account is restricted by admin",
            });
        }

        const { orderId } = req.params;
        const { refundAmount } = req.body;

        if (!isValidObjectId(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order id",
            });
        }

        const parsedRefundAmount = Number(refundAmount);
        if (!Number.isFinite(parsedRefundAmount) || parsedRefundAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid refundAmount is required and must be greater than 0",
            });
        }

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
                message: "You can request refund only for your own orders",
            });
        }

        order.refundAmount += parsedRefundAmount;
        await order.save();

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
            message: "Refund request recorded successfully",
            data: order,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Error while processing refund request",
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
        if (!isValidObjectId(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order id",
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        order.paymentStatus = "paid";
        order.orderStatus = "accepted";
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

exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!isValidObjectId(orderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order id",
            });
        }

        const order = await Order.findById(orderId)
            .populate(
                "assignedDeliveryPartner",
                "name phone isAvailable activeDeliveries currentLocation"
            )
            .populate("restaurant", "name address city owner")
            .populate("user", "name email");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        const requesterId = req.user._id.toString();
        const isOwner = order.user._id.toString() === requesterId;
        const isRestaurantOwner =
            req.user.role === "restaurant" &&
            order.restaurant?.owner?.toString() === requesterId;
        const isAdmin = req.user.role === "admin";

        let isAssignedPartner = false;
        if (req.user.role === "delivery") {
            const partner = await DeliveryPartner.findOne({ user: req.user._id });
            isAssignedPartner =
                partner &&
                order.assignedDeliveryPartner &&
                order.assignedDeliveryPartner._id.toString() === partner._id.toString();
        }

        if (!isOwner && !isRestaurantOwner && !isAdmin && !isAssignedPartner) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view this order",
            });
        }

        return res.status(200).json({
            success: true,
            data: order,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate("restaurant");
        return res.status(200).json({
            success: true,
            data: orders,
        });
    } catch (error) {
        return res.status(500).json({
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

const formatStatus = (status) => {
    if (status === "out_for_delivery") return "Out For Delivery";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        if (!isValidObjectId(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid order id" });
        }

        const allowedStatuses = ["pending", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const order = await Order.findById(orderId).populate("restaurant");
        
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        
        const isAdmin = req.user && req.user.role === 'admin';
        const isRestaurantOwner = req.user && order.restaurant.owner.toString() === req.user._id.toString();
        
        if (!isAdmin && !isRestaurantOwner) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        
        order.orderStatus = status;
        await order.save();
        
        const notificationMessage = `Notification: Order status updated to ${formatStatus(status)}`;
        console.log(notificationMessage);

        res.status(200).json({ success: true, message: notificationMessage, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
