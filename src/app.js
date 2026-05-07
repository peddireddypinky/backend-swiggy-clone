const express = require('express');
const cors = require('cors');
const dns = require("node:dns/promises");
require("dotenv").config();

const app = express();


dns.setServers(["8.8.8.8", "1.1.1.1"]);
console.log("DNS servers set to:", dns.getServers());
// Middleware
app.use(cors());
app.use(express.json());

// Routes imports
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoute');
const menuRoutes = require("./routes/menuRoute");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const fraudRoutes = require("./routes/fraudRoutes");

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/fraud", fraudRoutes);

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to the Swiggy API'
    });
});

module.exports = app;