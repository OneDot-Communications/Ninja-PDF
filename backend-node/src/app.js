const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const fileRoutes = require('./routes/file.routes');
const toolRoutes = require('./routes/tool.routes');
const subRoutes = require('./routes/subscription.routes');
const coreRoutes = require('./routes/core.routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: config.app.clientUrl,
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/billing', subRoutes);
app.use('/api/core', coreRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

module.exports = app;
