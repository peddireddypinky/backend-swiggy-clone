require("dotenv").config({ path: "./src/config/.env" });

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        console.log("🚀 Starting server...");

        await connectDB();
        console.log("✅ Database connected successfully");

        const server = http.createServer(app);
        const io = new Server(server, {
            cors: {
                origin: "*",
            },
        });

        app.set("io", io);

        io.on("connection", (socket) => {
            socket.on("join-order", (orderId) => {
                if (orderId) {
                    socket.join(`order:${orderId}`);
                }
            });
        });

        server.listen(PORT, () => {
            console.log(`✅ Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Server failed to start:", error.message);
        process.exit(1);
    }
};

startServer();