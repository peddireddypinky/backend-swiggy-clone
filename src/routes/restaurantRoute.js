const express = require('express');
const router = express.Router();
const { 
    createRestaurant, 
    getMyRestaurant, 
    updateRestaurant, 
    getAllRestaurants,
    searchRestaurants,
} = require('../controllers/restaurantController');
const { protect } = require('../config/middleware/authmiddleware');

router.post('/', protect, createRestaurant);
router.get('/my', protect, getMyRestaurant);
router.put('/:id', protect, updateRestaurant);
router.get('/search', searchRestaurants);
router.get('/', getAllRestaurants);
module.exports = router;