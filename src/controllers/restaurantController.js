const Restaurant = require("../config/models/restaurant");

const parsePositiveNumber = (value) => {
    if (value === undefined) {
        return undefined;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
        return null;
    }

    return parsed;
};

const parseBoolean = (value) => {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value === "boolean") {
        return value;
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    return null;
};

const escapeRegex = (input = "") =>
    input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFuzzyRegexPatterns = (searchText = "") => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) {
        return [];
    }

    const exactPattern = escapeRegex(normalized)
        .split("")
        .join(".*");

    const typoPatterns = [];
    for (let i = 0; i < normalized.length; i += 1) {
        const withoutOneChar = normalized.slice(0, i) + normalized.slice(i + 1);
        if (!withoutOneChar) {
            continue;
        }
        typoPatterns.push(
            escapeRegex(withoutOneChar)
                .split("")
                .join(".*")
        );
    }

    return [exactPattern, ...typoPatterns];
};

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

exports.searchRestaurants = async (req, res) => {
    try {
        const {
            q,
            cuisine,
            rating,
            minPrice,
            maxPrice,
            maxDeliveryTime,
            vegOnly,
            popularity,
            sortBy,
        } = req.query;

        const ratingNumber = parsePositiveNumber(rating);
        const minPriceNumber = parsePositiveNumber(minPrice);
        const maxPriceNumber = parsePositiveNumber(maxPrice);
        const maxDeliveryTimeNumber = parsePositiveNumber(maxDeliveryTime);
        const popularityNumber = parsePositiveNumber(popularity);
        const vegOnlyBoolean = parseBoolean(vegOnly);

        if (
            ratingNumber === null ||
            minPriceNumber === null ||
            maxPriceNumber === null ||
            maxDeliveryTimeNumber === null ||
            popularityNumber === null ||
            vegOnlyBoolean === null
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid filter query parameters",
            });
        }

        if (
            minPriceNumber !== undefined &&
            maxPriceNumber !== undefined &&
            minPriceNumber > maxPriceNumber
        ) {
            return res.status(400).json({
                success: false,
                message: "minPrice cannot be greater than maxPrice",
            });
        }

        const matchStage = { isApproved: true };

        if (ratingNumber !== undefined) {
            matchStage.rating = { $gte: ratingNumber };
        }

        if (minPriceNumber !== undefined || maxPriceNumber !== undefined) {
            matchStage.priceRange = {};
            if (minPriceNumber !== undefined) {
                matchStage.priceRange.$gte = minPriceNumber;
            }
            if (maxPriceNumber !== undefined) {
                matchStage.priceRange.$lte = maxPriceNumber;
            }
        }

        if (maxDeliveryTimeNumber !== undefined) {
            matchStage.deliveryTime = { $lte: maxDeliveryTimeNumber };
        }

        if (vegOnlyBoolean === true) {
            matchStage.isVeg = true;
        }

        if (popularityNumber !== undefined) {
            matchStage.popularity = { $gte: popularityNumber };
        }

        const searchTerms = [];
        if (q) {
            searchTerms.push(q);
        }
        if (cuisine) {
            searchTerms.push(cuisine);
        }

        const fuzzyPatterns = [];
        for (const term of searchTerms) {
            fuzzyPatterns.push(...buildFuzzyRegexPatterns(term));
        }

        const orSearchFilters = [];
        if (fuzzyPatterns.length > 0) {
            for (const pattern of fuzzyPatterns) {
                orSearchFilters.push({ name: { $regex: pattern, $options: "i" } });
                orSearchFilters.push({ cuisine: { $regex: pattern, $options: "i" } });
            }
        }

        if (orSearchFilters.length > 0) {
            matchStage.$or = orSearchFilters;
        }

        let sortStage = { rating: -1 };
        if (sortBy === "fastest_delivery") {
            sortStage = { deliveryTime: 1 };
        } else if (sortBy === "most_popular") {
            sortStage = { popularity: -1 };
        } else if (sortBy === "highest_rating") {
            sortStage = { rating: -1 };
        }

        if (!sortBy && req.query.fastest === "true") {
            sortStage = { deliveryTime: 1 };
        }
        if (!sortBy && req.query.highestRating === "true") {
            sortStage = { rating: -1 };
        }
        if (!sortBy && req.query.mostPopular === "true") {
            sortStage = { popularity: -1 };
        }

        const pipeline = [
            { $match: matchStage },
            { $sort: sortStage },
        ];

        const restaurants = await Restaurant.aggregate(pipeline);

        return res.status(200).json({
            success: true,
            count: restaurants.length,
            data: restaurants,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error searching restaurants",
            error: error.message,
        });
    }
};