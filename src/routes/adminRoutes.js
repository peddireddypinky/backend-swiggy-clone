const express = require('express');
const router = express.Router();

const { protect, adminOnly } = require('../config/middleware/authmiddleware');
const { getallUsers, toggleBlockUser, approveRestaurant, getallorders, getPlatformStatistics } = require('../controllers/AdminController');


router.use(protect);
router.use(adminOnly);


router.get("/", getallUsers);
router.put("/users/:id/block", toggleBlockUser);
router.put("/restaurants/:id/approve", approveRestaurant);
router.get("/statistics", getPlatformStatistics);
router.get("/orders", getallorders);


module.exports = router;