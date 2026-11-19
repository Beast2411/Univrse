require("dotenv").config();

const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const {connectDatabase} = require("./config/db");
const attendanceController = require("./controllers/attendanceController");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();
const port = Number(process.env.PORT) || 5000;
let mongoMessage = process.env.MONGO_URI ? null : "MONGO_URI is not configured.";

app.use(cors());
app.use(express.json({limit: "100kb"}));
app.get("/api/health", (req, res) => {
    const mongoConnected = mongoose.connection.readyState === 1;
    res.json({
        status: "ok",
        storage: mongoConnected ? "mongodb" : "local-json",
        mongoConnected,
        mongoMessage: mongoConnected ? null : mongoMessage
    });
});
app.use("/api/attendance", attendanceRoutes);
app.use((req, res) => {
    res.status(404).json({message: "API route not found."});
});
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status
        || (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);
    if (status >= 500) console.error("API error:", error);
    res.status(status).json({
        message: status >= 500 ? "Attendance API encountered an internal error." : error.message
    });
});

async function start() {
    let mongoConnected = false;
    try {
        mongoConnected = await connectDatabase(process.env.MONGO_URI);
        if (mongoConnected) await attendanceController.initializeMongo();
    } catch (error) {
        mongoMessage = `MongoDB connection failed: ${error.message}`;
        console.error(mongoMessage);
        await mongoose.disconnect();
    }

    app.listen(port, "0.0.0.0", () => {
        console.log(`UNIVRSE API listening on port ${port} (${mongoConnected ? "MongoDB" : "persistent local JSON"} storage).`);
        if (!mongoConnected) {
            console.warn(`${mongoMessage} Existing attendance data is preserved in the local store.`);
        }
    });
}

start().catch(error => {
    console.error("Could not start the UNIVRSE API:", error);
    process.exitCode = 1;
});