require("dotenv").config({ path: "./src/config/.env" });

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        console.log("🚀 Starting server...");

        // Connect to DB
        await connectDB();
        console.log("✅ Database connected successfully");

        // Start server
        app.listen(PORT, () => {
            console.log(`✅ Server is running on port ${PORT}`);
        });

    } catch (error) {
        console.error("❌ Server failed to start:", error.message);
        process.exit(1); // stop app if DB fails
    }
};

startServer();