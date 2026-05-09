const jwt = require('jsonwebtoken');
const User = require("../models/User");

exports.protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // check header exists & format
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, token missing"
            });
        }

        
        const token = authHeader.split(" ")[1];

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "JWT secret is not configured",
            });
        }

        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        
        const user = await User.findById(decoded.id);

        if (!user || user.isBlocked) {
            return res.status(401).json({
                success: false,
                message: "Access denied"
            });
        }

      
        req.user = user;

        next();

    } catch (error) {
        console.log(error);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};



exports.authorize = (...roles) => {
    return (req, res, next) => {

        // check user exists
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // check role
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden - Access denied"
            });
        }

        next();
    };
};

exports.adminOnly = exports.authorize("admin");