const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDatabase = require('./config/db');
const success = require('./utils/apiResponse').success;
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
