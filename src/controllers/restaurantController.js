const Restaurant = require("../config/models/restaurant");

exports.createRestaurant = async (req, res) => {
    try {
        if (req.user.role !== "restaurant") {
            return res.status(403).json({
                success: false,
                message: "Only restaurant owners can create restaurants",
            });
        }

        const existingRestaurant = await Restaurant.findOne({ owner: req.user._id });
        if (existingRestaurant) {
            return res.status(400).json({
                success: false,
                message: "You have already created a restaurant",
            });
        }

        const createdRestaurant = await Restaurant.create({
            ...req.body,
            owner: req.user._id,
        });

        return res.status(201).json({
            success: true,
            message: "Restaurant created successfully",
            data: createdRestaurant,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error creating restaurant",
            error: error.message,
        });
    }
};

exports.getMyRestaurant = async (req, res) => {
    try {
        const myRestaurant = await Restaurant.findOne({ owner: req.user._id });
        if (!myRestaurant) {
            return res.status(404).json({
                success: false,
                message: "You don't have a restaurant registered",
            });
        }

        return res.status(200).json({
            success: true,
            data: myRestaurant,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching your restaurant",
            error: error.message,
        });
    }
};

exports.updateRestaurant = async (req, res) => {
    try {
        const existingRestaurant = await Restaurant.findById(req.params.id);
        if (!existingRestaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        if (existingRestaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this restaurant",
            });
        }

        const updatedRestaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });

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

exports.getAllRestaurants = async (req, res) => {
    try {
        const { city, page = 1, limit = 10 } = req.query;
        const query = { isApproved: true };

        if (city) {
            query.city = city;
        }

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        const restaurants = await Restaurant.find(query)
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: restaurants,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching restaurants",
            error: error.message,
        });
    }
};