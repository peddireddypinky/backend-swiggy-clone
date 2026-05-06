const express = require('express');
const router = express.Router();

const { protect } = require("../config/middleware/authmiddleware");
const { addMenuItem, deleteMenuItem, updateMenuItem, getMenuByRestaurant } = require('../controllers/menuController');

router.post('/', protect, addMenuItem);
router.get('/:id', protect, getMenuByRestaurant);
router.delete('/:id', protect, deleteMenuItem);
router.put('/:id', protect, updateMenuItem);
module.exports = router;