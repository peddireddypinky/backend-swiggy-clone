const mongoose = require('mongoose');

const connectDB = async () => {
    console.log("🔄 Connecting to MongoDB...");
    const primaryUri = process.env.MONGO_URI;
    const fallbackUri = process.env.MONGO_URI_DIRECT;
    const localUri = process.env.MONGO_URI_LOCAL || 'mongodb://127.0.0.1:27017/siwggy';

    const attempts = [
        { label: 'local', uri: localUri },
        { label: 'primary', uri: primaryUri },
        { label: 'direct', uri: fallbackUri },
    ].filter((entry) => entry.uri);

    let lastError;
    for (const attempt of attempts) {
        try {
            await mongoose.connect(attempt.uri, {
                serverSelectionTimeoutMS: 10000,
            });
            console.log(`✅ MongoDB connected successfully via ${attempt.label}`);
            return;
        } catch (error) {
            lastError = error;
            console.warn(`${attempt.label} URI failed: ${error.message}`);
        }
    }

    throw lastError || new Error('Unable to connect to MongoDB');
};

module.exports = connectDB;