const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
// Some students test login with GET; allow it too to avoid "Cannot GET /..." during learning.
router.get('/login', login);

module.exports = router;