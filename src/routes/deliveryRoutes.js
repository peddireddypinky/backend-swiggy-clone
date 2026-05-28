const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../config/middleware/authmiddleware");
const { setStatus, declineOrder } = require("../controllers/deliveryController");

router.use(protect);
router.use(authorize("delivery"));

router.post("/set-status", setStatus);
router.post("/decline/:orderId", declineOrder);

module.exports = router;
