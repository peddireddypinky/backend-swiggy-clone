const mongoose = require("mongoose");

const fraudLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
        riskScore: {
            type: Number,
            required: true,
        },
        fraudReason: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            enum: ["flagged", "approved", "rejected", "restricted"],
            default: "flagged",
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("FraudLogs", fraudLogSchema);
