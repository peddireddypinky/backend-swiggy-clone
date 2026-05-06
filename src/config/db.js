const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log("🔄 Connecting to MongoDB...");
        console.log("URI:", process.env.MONGO_URI); // debug (remove later)

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // fail fast if cannot connect
        });

        console.log("✅ MongoDB connected successfully");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;