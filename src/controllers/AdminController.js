const Order = require("../config/models/Order");
const User = require("../config/models/User");
const Restaurant = require("../config/models/restaurant");
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
