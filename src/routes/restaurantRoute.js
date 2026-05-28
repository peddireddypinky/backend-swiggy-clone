const express = require('express');
const router = express.Router();
const { 
    createRestaurant, 
    getMyRestaurant, 
    updateRestaurant, 
    getAllRestaurants,
    searchRestaurants,
    getRecommendations,
} = require('../controllers/restaurantController');
const { protect } = require('../config/middleware/authmiddleware');

router.post('/', protect, createRestaurant);
router.get('/my', protect, getMyRestaurant);
router.get('/recommendations/:userId', protect, getRecommendations);
router.put('/:id', protect, updateRestaurant);
router.get('/search', searchRestaurants);
router.get('/', getAllRestaurants);
module.exports = router;