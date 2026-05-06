require("dotenv").config({ path: "./src/config/.env" });

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    console.log("🚀 Starting server...");

    await connectDB();

    app.listen(PORT, () => {
        console.log(`✅ Server is running on port ${PORT}`);
    });
};

startServer();