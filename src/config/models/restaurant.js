const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        cuisine: {
            type: String,
            required: true,
            default: "Unknown",
            trim: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        priceRange: {
            type: Number,
            required: true,
            default: 1,
            min: 1,
        },
        deliveryTime: {
            type: Number,
            required: true,
            default: 30,
            min: 1,
        },
        isVeg: {
            type: Boolean,
            default: false,
        },
        popularity: {
            type: Number,
            default: 0,
            min: 0,
        },
        image: {
            type: String,
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number],
                default: undefined,
            },
        },
    },
    { timestamps: true }
);

restaurantSchema.index({ location: "2dsphere" });

restaurantSchema.index({ name: "text", cuisine: "text" });
restaurantSchema.index({ cuisine: 1, rating: -1 });
restaurantSchema.index({ deliveryTime: 1 });
restaurantSchema.index({ popularity: -1 });
restaurantSchema.index({ isVeg: 1, priceRange: 1 });

module.exports = mongoose.model("Restaurant", restaurantSchema);