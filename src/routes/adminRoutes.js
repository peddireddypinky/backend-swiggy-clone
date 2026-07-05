const express = require('express');
const router = express.Router();

<<<<<<< HEAD
const { protect, adminOnly } = require('../config/middleware/authmiddleware');
const {
    getallUsers,
    toggleBlockUser,
    approveRestaurant,
    getallorders,
    getPlatformStatistics,
    createRestaurantByAdmin,
    updateRestaurantByAdmin,
    createSurgeSetting,
    getSurgeSettings,
    updateSurgeSetting,
    getDeliveryPartners,
} = require('../controllers/AdminController');


router.use(protect);
router.use(adminOnly);
=======
const { protect, authorize } = require('../config/middleware/authmiddleware');
const { getallUsers, toggleBlockUser, approveRestaurant, getallorders, getPlatformStatistics } = require('../controllers/AdminController');


router.use(protect);
router.use(authorize("admin"));
>>>>>>> 05e941ffab24bcbc1b17938aa0bd7aa97f76fca0


router.get("/", getallUsers);
router.put("/users/:id/block", toggleBlockUser);
router.put("/restaurants/:id/approve", approveRestaurant);
router.get("/statistics", getPlatformStatistics);
router.get("/orders", getallorders);
<<<<<<< HEAD
router.post("/restaurants/create", createRestaurantByAdmin);
router.put("/restaurants/update/:restaurantId", updateRestaurantByAdmin);

router.post("/surge-settings", createSurgeSetting);
router.get("/surge-settings", getSurgeSettings);
router.put("/surge-settings/:id", updateSurgeSetting);
router.get("/delivery-partners", getDeliveryPartners);


module.exports = router;
=======


module.exports = router;
>>>>>>> 05e941ffab24bcbc1b17938aa0bd7aa97f76fca0
