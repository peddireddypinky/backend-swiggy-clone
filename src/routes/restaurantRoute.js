const express = require('express');
const router = express.Router();
const { 
    createRestaurant, 
    getMyRestaurant, 
    updateRestaurant, 
    getAllRestaurants 
} = require('../controllers/restaurantController');
const { protect } = require('../config/middleware/authmiddleware');

router.post('/', protect, createRestaurant);
router.get('/my', protect, getMyRestaurant);
router.put('/:id', protect, updateRestaurant);
router.get('/', getAllRestaurants);
module.exports = router;