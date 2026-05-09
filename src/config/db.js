const mongoose = require('mongoose');

const connectDB = async () => {
    console.log("🔄 Connecting to MongoDB...");
    const primaryUri = process.env.MONGO_URI;
    const fallbackUri = process.env.MONGO_URI_DIRECT;

    try {
        await mongoose.connect(primaryUri, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log("✅ MongoDB connected successfully");
        return;
    } catch (error) {
        if (!fallbackUri) {
            throw error;
        }
        console.warn(`Primary URI failed, retrying with direct URI: ${error.message}`);
        await mongoose.connect(fallbackUri, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log("✅ MongoDB connected successfully (direct URI fallback)");
    }
};

module.exports = connectDB;