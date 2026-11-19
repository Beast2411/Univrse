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
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDatabase = require('./config/db');
const { success } = require('./utils/apiResponse');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5500')
  .split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error('This frontend origin is not allowed by CORS');
    error.status = 403;
    return callback(error);
  }
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  success(res, connected ? 200 : 503, connected ? 'API is ready' : 'Database is not connected', {
    status: connected ? 'ready' : 'database_disconnected',
    database: connected ? 'connected' : 'disconnected'
  });
});
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/timetable', require('./routes/timetableRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/marketplace', require('./routes/marketplaceRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/helpdesk', require('./routes/helpdeskRoutes'));
app.use('/api/weather', require('./routes/weatherRoutes'));
app.use(notFoundMiddleware);
app.use(errorMiddleware);

async function startServer() {
  await connectDatabase();
  const port = Number(process.env.PORT) || 5000;
  return app.listen(port, () => console.log(`UNIVRSE API listening on http://localhost:${port}/api`));
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Backend startup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
