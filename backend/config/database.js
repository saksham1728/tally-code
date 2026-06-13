/**
 * Database Configuration Module
 * 
 * Provides MongoDB connection functionality with:
 * - Connection retry logic with exponential backoff
 * - Error handling and logging
 * - Connection state monitoring
 * 
 * Requirements: 15.2, 19.1-19.7
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB with retry logic
 * 
 * @param {string} uri - MongoDB connection URI (defaults to MONGODB_URI env variable)
 * @param {Object} options - Connection options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 5)
 * @param {number} options.retryDelay - Initial retry delay in milliseconds (default: 1000)
 * @returns {Promise<typeof mongoose>} Mongoose instance on successful connection
 */
async function connectDatabase(uri = process.env.MONGODB_URI, options = {}) {
  const {
    maxRetries = 5,
    retryDelay = 1000
  } = options;

  let retryCount = 0;
  let currentDelay = retryDelay;

  /**
   * Attempt to connect to MongoDB with exponential backoff
   */
  async function attemptConnection() {
    try {
      console.log(`Attempting to connect to MongoDB... (Attempt ${retryCount + 1}/${maxRetries})`);
      
      // Mongoose connection options
      const mongooseOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        socketTimeoutMS: 45000, // 45 second socket timeout
      };

      // Connect to MongoDB
      await mongoose.connect(uri, mongooseOptions);
      
      console.log('✓ MongoDB connected successfully');
      return mongoose;
    } catch (error) {
      retryCount++;
      
      // Log the error with details
      console.error(`✗ MongoDB connection failed (Attempt ${retryCount}/${maxRetries}):`, error.message);
      
      // If max retries reached, throw the error
      if (retryCount >= maxRetries) {
        console.error('✗ Max connection retry attempts reached. Database connection failed.');
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying with exponential backoff
      console.log(`Retrying in ${currentDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      // Increase delay exponentially for next attempt (with a cap at 30 seconds)
      currentDelay = Math.min(currentDelay * 2, 30000);
      
      // Recursive retry
      return attemptConnection();
    }
  }

  return attemptConnection();
}

/**
 * Set up MongoDB connection event handlers
 * Monitors connection state changes and logs important events
 */
function setupConnectionHandlers() {
  const db = mongoose.connection;

  db.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
  });

  db.on('error', (err) => {
    console.error('Mongoose connection error:', err);
  });

  db.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
  });

  // Handle application termination
  process.on('SIGINT', async () => {
    try {
      await db.close();
      console.log('Mongoose connection closed through app termination');
      process.exit(0);
    } catch (err) {
      console.error('Error closing Mongoose connection:', err);
      process.exit(1);
    }
  });
}

/**
 * Gracefully close the database connection
 * 
 * @returns {Promise<void>}
 */
async function closeDatabase() {
  try {
    await mongoose.connection.close();
    console.log('Database connection closed successfully');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}

/**
 * Check if database is connected
 * 
 * @returns {boolean} True if connected, false otherwise
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Get current connection state
 * 
 * @returns {string} Connection state: disconnected, connected, connecting, or disconnecting
 */
function getConnectionState() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = {
  connectDatabase,
  setupConnectionHandlers,
  closeDatabase,
  isConnected,
  getConnectionState
};
