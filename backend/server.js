const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const subjectRoutes = require('./routes/subjects');
const chapterRoutes = require('./routes/chapters');
const pdfRoutes = require('./routes/pdfs');
const imageRoutes = require('./routes/images');
const questionRoutes = require('./routes/questions');
const questionPaperRoutes = require('./routes/questionPapers');
const dashboardRoutes = require('./routes/dashboard');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

// Import database connection
const connectDB = require('./config/database');

// Import logger
const logger = require('./utils/logger');

// Import seeder
const seeder = require('./utils/seeder');

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Rate limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/subjects', authMiddleware, subjectRoutes);
app.use('/api/chapters', authMiddleware, chapterRoutes);
app.use('/api/pdfs', authMiddleware, pdfRoutes);
app.use('/api/images', authMiddleware, imageRoutes);
app.use('/api/questions', authMiddleware, questionRoutes);
app.use('/api/question-papers', authMiddleware, questionPaperRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// Error handler
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Port
const PORT = process.env.PORT || 5025;

// Connect to DB and start server
connectDB().then(async () => {
  try {
    logger.info('Starting database seeding...');
    await seeder.runAll();
    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Seeder error:', error);
  }

  try {
    const server = app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (err) {
    logger.error('❌ Server failed to start:', err);
    process.exit(1);
  }
});

// Crash handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🧨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('💥 Uncaught Exception thrown:', err);
  process.exit(1);
});

module.exports = app;
