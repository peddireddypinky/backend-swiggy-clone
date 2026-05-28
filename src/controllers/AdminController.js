const Order = require("../config/models/Order");
const User = require("../config/models/User");
const Restaurant = require("../config/models/restaurant");
const SurgeSetting = require("../config/models/SurgeSetting");
const DeliveryPartner = require("../config/models/DeliveryPartner");
const mongoose = require("mongoose");

const validateRestaurantPayload = (payload = {}, isUpdate = false) => {
    const errors = [];
    const requiredFields = [
        "name",
        "cuisine",
        "priceRange",
        "deliveryTime",
        "address",
    ];

    if (!isUpdate) {
        for (const field of requiredFields) {
            if (!payload[field] && payload[field] !== 0) {
                errors.push(`${field} is required`);
            }
        }
    }

    if (payload.rating !== undefined) {
        const ratingValue = Number(payload.rating);
        if (Number.isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
            errors.push("rating must be between 0 and 5");
        }
    }

    if (payload.priceRange !== undefined) {
        const priceValue = Number(payload.priceRange);
        if (Number.isNaN(priceValue) || priceValue <= 0) {
            errors.push("priceRange must be a positive number");
        }
    }

    if (payload.deliveryTime !== undefined) {
        const deliveryValue = Number(payload.deliveryTime);
        if (Number.isNaN(deliveryValue) || deliveryValue <= 0) {
            errors.push("deliveryTime must be a positive number");
        }
    }

    if (payload.popularity !== undefined) {
        const popularityValue = Number(payload.popularity);
        if (Number.isNaN(popularityValue) || popularityValue < 0) {
            errors.push("popularity must be a non-negative number");
        }
    }

    if (payload.isVeg !== undefined && typeof payload.isVeg !== "boolean") {
        errors.push("isVeg must be boolean");
    }

    return errors;
};

exports.getallUsers = async (req, res) => {
    try {
        const users = await User.find({ role: "user" }).select("-password");
        res.status(200).json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.toggleBlockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.status(200).json({
            success: true,
            message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.approveRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }
        restaurant.isApproved = !restaurant.isApproved;
        await restaurant.save();
        res.status(200).json({
            success: true,
            message: `Restaurant ${restaurant.isApproved ? "approved" : "rejected"} successfully`,
            data: restaurant,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getallorders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email")
            .populate("restaurant", "name");
        res.status(200).json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getPlatformStatistics = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: "user" });
        const totalRestaurants = await Restaurant.countDocuments();
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $match: { paymentStatus: "paid" } },
            { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalRestaurants,
                totalOrders,
                totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.createRestaurantByAdmin = async (req, res) => {
    try {
        const validationErrors = validateRestaurantPayload(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: validationErrors.join(", "),
            });
        }

        let ownerId = req.body.owner;
        if (!ownerId) {
            const fallbackOwner = await User.findOne({ role: "admin" });
            ownerId = fallbackOwner?._id;
        }

        if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
            return res.status(400).json({
                success: false,
                message: "Valid owner id is required",
            });
        }

        const payload = {
            name: req.body.name,
            cuisine: req.body.cuisine,
            owner: ownerId,
            city: req.body.city || "Unknown",
            address: req.body.address,
            rating: req.body.rating ?? 0,
            priceRange: req.body.priceRange,
            deliveryTime: req.body.deliveryTime,
            isVeg: req.body.isVeg ?? false,
            popularity: req.body.popularity ?? 0,
            image: req.body.image,
            isApproved: req.body.isApproved ?? true,
        };

        const restaurant = await Restaurant.create(payload);

        return res.status(201).json({
            success: true,
            message: "Restaurant created successfully",
            data: restaurant,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error creating restaurant",
            error: error.message,
        });
    }
};

exports.updateRestaurantByAdmin = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid restaurant id",
            });
        }

        const validationErrors = validateRestaurantPayload(req.body, true);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: validationErrors.join(", "),
            });
        }

        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            restaurantId,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!updatedRestaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Restaurant updated successfully",
            data: updatedRestaurant,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error updating restaurant",
            error: error.message,
        });
    }
};

const validateSurgePayload = (payload = {}, isUpdate = false) => {
    const errors = [];

    if (!isUpdate) {
        if (!payload.region || typeof payload.region !== "string" || !payload.region.trim()) {
            errors.push("region is required");
        }
    }

    if (payload.baseDeliveryFee !== undefined) {
        const v = Number(payload.baseDeliveryFee);
        if (!Number.isFinite(v) || v < 0) errors.push("baseDeliveryFee must be a number >= 0");
    }

    if (payload.surgeMultiplier !== undefined) {
        const v = Number(payload.surgeMultiplier);
        if (!Number.isFinite(v) || v < 1) errors.push("surgeMultiplier must be a number >= 1");
    }

    if (payload.demandThreshold !== undefined) {
        const v = Number(payload.demandThreshold);
        if (!Number.isFinite(v) || v < 0) errors.push("demandThreshold must be a number >= 0");
    }

    if (payload.peakHours !== undefined) {
        if (!Array.isArray(payload.peakHours)) {
            errors.push("peakHours must be an array");
        } else {
            for (const window of payload.peakHours) {
                if (!window || typeof window !== "object") {
                    errors.push("peakHours entries must be objects");
                    break;
                }
                if (typeof window.start !== "string" || typeof window.end !== "string") {
                    errors.push("peakHours entries must have start and end strings");
                    break;
                }
            }
        }
    }

    return errors;
};

exports.createSurgeSetting = async (req, res) => {
    try {
        const errors = validateSurgePayload(req.body, false);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors.join(", ") });
        }

        const payload = {
            region: req.body.region.trim(),
            baseDeliveryFee: req.body.baseDeliveryFee ?? 30,
            surgeMultiplier: req.body.surgeMultiplier ?? 1.5,
            demandThreshold: req.body.demandThreshold ?? 25,
            peakHours: req.body.peakHours ?? [],
        };

        const created = await SurgeSetting.create(payload);
        return res.status(201).json({ success: true, message: "Surge setting created", data: created });
    } catch (error) {
        const isDup = error?.code === 11000;
        return res.status(isDup ? 409 : 500).json({
            success: false,
            message: isDup ? "Surge setting already exists for this region" : error.message,
        });
    }
};

exports.getSurgeSettings = async (req, res) => {
    try {
        const settings = await SurgeSetting.find().sort({ region: 1, createdAt: -1 });
        return res.status(200).json({ success: true, data: settings, count: settings.length });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateSurgeSetting = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid surge setting id" });
        }

        const errors = validateSurgePayload(req.body, true);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors.join(", ") });
        }

        const update = {};
        if (req.body.region !== undefined) update.region = String(req.body.region).trim();
        if (req.body.baseDeliveryFee !== undefined) update.baseDeliveryFee = Number(req.body.baseDeliveryFee);
        if (req.body.surgeMultiplier !== undefined) update.surgeMultiplier = Number(req.body.surgeMultiplier);
        if (req.body.demandThreshold !== undefined) update.demandThreshold = Number(req.body.demandThreshold);
        if (req.body.peakHours !== undefined) update.peakHours = req.body.peakHours;

        const updated = await SurgeSetting.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: "Surge setting not found" });
        }

        return res.status(200).json({ success: true, message: "Surge setting updated", data: updated });
    } catch (error) {
        const isDup = error?.code === 11000;
        return res.status(isDup ? 409 : 500).json({
            success: false,
            message: isDup ? "Surge setting already exists for this region" : error.message,
        });
    }
};

exports.getDeliveryPartners = async (req, res) => {
    try {
        const partners = await DeliveryPartner.find()
            .populate("user", "name email role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: partners.length,
            data: partners,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
