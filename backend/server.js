/**
 * Express Server - Main Entry Point
 * 
 * Initializes Express application and wires all route modules.
 * 
 * Requirements: 12.10, 16.4
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDatabase, setupConnectionHandlers } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

// Import route modules
const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/company.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const logRoutes = require('./routes/log.routes');
const adminRoutes = require('./routes/admin.routes');
const fieldMappingRoutes = require('./routes/fieldMapping.routes');

// Initialize Express app
const app = express();

// Port configuration
const PORT = process.env.PORT || 5000;

/**
 * Middleware Configuration
 */

// CORS - Allow cross-origin requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser middleware - Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/field-mapping', fieldMappingRoutes);

/**
 * Error Handling
 * Must be registered after all routes
 */

// 404 handler for undefined routes
app.use(notFoundHandler);

// Central error handler (must be last)
app.use(errorHandler);

/**
 * Database Connection and Server Startup
 */
async function startServer() {
  try {
    // Validate required environment variables
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not defined');
    }
    
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not defined');
    }
    
    console.log('Starting B2B Invoice Sync Platform API...\n');
    
    // Connect to MongoDB
    await connectDatabase(process.env.MONGODB_URI);
    
    // Setup connection event handlers
    setupConnectionHandlers();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n✓ Server is running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      console.log(`✓ API Base URL: http://localhost:${PORT}/api\n`);
      console.log('Available routes:');
      console.log('  POST   /api/auth/register');
      console.log('  POST   /api/auth/login');
      console.log('  GET    /api/auth/me');
      console.log('  GET    /api/company/me');
      console.log('  PUT    /api/company/me');
      console.log('  POST   /api/company/tally-connection');
      console.log('  POST   /api/company/test-connection');
      console.log('  GET    /api/invoices');
      console.log('  GET    /api/invoices/:id');
      console.log('  POST   /api/invoices/import-from-tally');
      console.log('  POST   /api/invoices/:id/push-to-tally');
      console.log('  PUT    /api/invoices/:id/status');
      console.log('  GET    /api/logs');
      console.log('  GET    /api/admin/companies');
      console.log('  GET    /api/admin/stats');
      console.log('  POST   /api/admin/match/:invoiceId');
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Server ready to accept requests');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
    
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // In production, you might want to shut down gracefully
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Export app for testing purposes
module.exports = app;
