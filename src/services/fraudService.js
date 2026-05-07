const Order = require("../config/models/Order");

const RISK_RULES = {
    multipleFastOrders: 40,
    repeatedCancellations: 30,
    couponAbuse: 20,
    excessiveRefunds: 30,
};

const FRAUD_THRESHOLD = 50;

const buildFraudScore = async ({ userId, couponCode }) => {
    let riskScore = 0;
    const reasons = [];

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const fastOrdersCount = await Order.countDocuments({
        user: userId,
        createdAt: { $gte: tenMinutesAgo },
    });
    if (fastOrdersCount >= 3) {
        riskScore += RISK_RULES.multipleFastOrders;
        reasons.push("Multiple orders placed in a short time");
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cancelledOrdersCount = await Order.countDocuments({
        user: userId,
        orderStatus: "cancelled",
        updatedAt: { $gte: thirtyDaysAgo },
    });
    if (cancelledOrdersCount >= 3) {
        riskScore += RISK_RULES.repeatedCancellations;
        reasons.push("Repeated order cancellations");
    }

    if (couponCode) {
        const sameCouponUsageCount = await Order.countDocuments({
            user: userId,
            couponCode,
            createdAt: { $gte: thirtyDaysAgo },
        });
        if (sameCouponUsageCount >= 3) {
            riskScore += RISK_RULES.couponAbuse;
            reasons.push("Coupon used too many times");
        }
    }

    const refundStats = await Order.aggregate([
        {
            $match: {
                user: userId,
                updatedAt: { $gte: thirtyDaysAgo },
            },
        },
        {
            $group: {
                _id: "$user",
                refundTotal: { $sum: "$refundAmount" },
            },
        },
    ]);
    const refundTotal = refundStats?.[0]?.refundTotal || 0;
    if (refundTotal >= 2000) {
        riskScore += RISK_RULES.excessiveRefunds;
        reasons.push("Excessive refunds requested");
    }

    return {
        riskScore,
        reasons,
        isSuspicious: riskScore >= FRAUD_THRESHOLD,
        fraudReason: reasons.join(", "),
    };
};

module.exports = {
    buildFraudScore,
    FRAUD_THRESHOLD,
};
