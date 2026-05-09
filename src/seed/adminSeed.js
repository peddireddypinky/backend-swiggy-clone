require("dotenv").config({ path: "./src/config/.env" });

const bcrypt = require("bcrypt");
const connectDB = require("../config/db");
const User = require("../config/models/User");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectWithRetry = async (retries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            await connectDB();
            return;
        } catch (error) {
            lastError = error;
            console.error(`MongoDB connection attempt ${attempt} failed: ${error.message}`);
            if (attempt < retries) {
                await sleep(1500);
            }
        }
    }
    throw lastError;
};

const seedAdmin = async () => {
    try {
        await connectWithRetry(4);

        const email = "admin@test.com";
        const password = "admin123";
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.findOneAndUpdate(
            { email },
            {
                name: "System Admin",
                email,
                password: hashedPassword,
                role: "admin",
                isBlocked: false,
                isRestricted: false,
            },
            { upsert: true, new: true }
        );

        console.log("Admin user seeded successfully");
        console.log("email: admin@test.com");
        console.log("password: admin123");
        process.exit(0);
    } catch (error) {
        console.error("Failed to seed admin:", error.message);
        process.exit(1);
    }
};

seedAdmin();
