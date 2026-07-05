const User = require("../config/models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res
                .status(400)
                .json({ success: false, message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
        });
        return res
            .status(201)
            .json({ success: true, message: "User registered successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.login = async (req, res) => {
    try {
        // Some testers call login using GET (body may be empty in some clients).
        // Support both:
        // - POST/GET with JSON body
        // - GET with query params ?email=...&password=...
        const email = req.body?.email ?? req.query?.email;
        const password = req.body?.password ?? req.query?.password;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res
                .status(400)
                .json({ success: false, message: "User not found" });
        }
        if (user.isBlocked) {
            return res
                .status(403)
                .json({ success: false, message: "User is blocked" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "swiggy_secret_key", {
            expiresIn: "1d",
        });
        return res
            .status(200)
            .json({ success: true, message: "User logged in successfully", token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};