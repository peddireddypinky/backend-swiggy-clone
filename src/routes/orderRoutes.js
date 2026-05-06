const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../config/middleware/authmiddleware');
const { placeOrder, getMyOrders, mockPayment, getRestaurantOrders, updateOrderStatus } = require('../controllers/orderController');


router.use(protect);
router.use(authorize("user"));
router.post("/", placeOrder);
router.get("/my", getMyOrders);
router.post("/verify", mockPayment);
router.get("/restaurant",authorize("restaurant"), getRestaurantOrders);
router.put("/:id/status", authorize("restaurant"), updateOrderStatus);

module.exports = router;