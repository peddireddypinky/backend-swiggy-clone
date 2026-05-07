const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../config/middleware/authmiddleware');
const { createOrder, cancelOrder, placeOrder, getMyOrders, mockPayment, getRestaurantOrders, updateOrderStatus } = require('../controllers/orderController');


router.use(protect);
router.post("/create", authorize("user"), createOrder);
router.post("/cancel/:orderId", authorize("user"), cancelOrder);
router.post("/", authorize("user"), placeOrder);
router.get("/my", authorize("user"), getMyOrders);
router.post("/verify", authorize("user"), mockPayment);
router.get("/restaurant", authorize("restaurant"), getRestaurantOrders);
router.put("/:id/status", authorize("restaurant"), updateOrderStatus);

module.exports = router;