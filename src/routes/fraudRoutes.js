const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../config/middleware/authmiddleware");
const {
    getSuspiciousOrders,
    approveSuspiciousOrder,
    rejectSuspiciousOrder,
    restrictUser,
} = require("../controllers/fraudController");

router.use(protect);
router.use(adminOnly);

router.get("/orders", getSuspiciousOrders);
router.post("/approve/:orderId", approveSuspiciousOrder);
router.post("/reject/:orderId", rejectSuspiciousOrder);
router.post("/restrict/:userId", restrictUser);

module.exports = router;
