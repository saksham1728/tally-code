/**
 * Unit tests for database configuration module
 * 
 * Tests connection logic, error handling, and retry mechanism
 */

const mongoose = require('mongoose');
const {
  connectDatabase,
  closeDatabase,
  isConnected,
  getConnectionState,
  setupConnectionHandlers
} = require('./database');

// Mock mongoose to control connection behavior
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 0,
    close: jest.fn(),
    on: jest.fn()
  }
}));

describe('Database Configuration Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mongoose connection state
    mongoose.connection.readyState = 0;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('connectDatabase', () => {
    it('should connect successfully on first attempt', async () => {
      // Mock successful connection
      mongoose.connect = jest.fn().mockResolvedValue(mongoose);
      
      const result = await connectDatabase('mongodb://localhost:27017/test');
      
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        expect.objectContaining({
          useNewUrlParser: true,
          useUnifiedTopology: true
        })
      );
      expect(result).toBe(mongoose);
    });

    it('should retry connection on failure with exponential backoff', async () => {
      // Mock connection to fail twice then succeed
      mongoose.connect = jest.fn()
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce(mongoose);
      
      // Mock setTimeout to execute immediately
      jest.spyOn(global, 'setTimeout').mockImplementation((cb) => {
        cb();
        return null;
      });
      
      const result = await connectDatabase('mongodb://localhost:27017/test', {
        maxRetries: 5,
        retryDelay: 100
      });
      
      expect(mongoose.connect).toHaveBeenCalledTimes(3);
      expect(result).toBe(mongoose);
      
      global.setTimeout.mockRestore();
    });

    it('should throw error after max retries exceeded', async () => {
      // Mock connection to always fail
      mongoose.connect = jest.fn().mockRejectedValue(new Error('Connection refused'));
      
      // Mock setTimeout to execute immediately
      jest.spyOn(global, 'setTimeout').mockImplementation((cb) => {
        cb();
        return null;
      });
      
      await expect(
        connectDatabase('mongodb://localhost:27017/test', {
          maxRetries: 3,
          retryDelay: 100
        })
      ).rejects.toThrow(/Failed to connect to MongoDB after 3 attempts/);
      
      expect(mongoose.connect).toHaveBeenCalledTimes(3);
      
      global.setTimeout.mockRestore();
    });

    it('should use environment variable for URI if not provided', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/env-test';
      mongoose.connect = jest.fn().mockResolvedValue(mongoose);
      
      await connectDatabase();
      
      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/env-test',
        expect.any(Object)
      );
      
      delete process.env.MONGODB_URI;
    });

    it('should apply custom connection options', async () => {
      mongoose.connect = jest.fn().mockResolvedValue(mongoose);
      
      await connectDatabase('mongodb://localhost:27017/test', {
        maxRetries: 10,
        retryDelay: 2000
      });
      
      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        expect.objectContaining({
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000
        })
      );
    });
  });

  describe('closeDatabase', () => {
    it('should close database connection successfully', async () => {
      mongoose.connection.close = jest.fn().mockResolvedValue(undefined);
      
      await closeDatabase();
      
      expect(mongoose.connection.close).toHaveBeenCalledTimes(1);
    });

    it('should throw error if closing fails', async () => {
      const error = new Error('Close failed');
      mongoose.connection.close = jest.fn().mockRejectedValue(error);
      
      await expect(closeDatabase()).rejects.toThrow('Close failed');
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', () => {
      mongoose.connection.readyState = 1; // connected
      expect(isConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      mongoose.connection.readyState = 0; // disconnected
      expect(isConnected()).toBe(false);
    });

    it('should return false when connecting', () => {
      mongoose.connection.readyState = 2; // connecting
      expect(isConnected()).toBe(false);
    });

    it('should return false when disconnecting', () => {
      mongoose.connection.readyState = 3; // disconnecting
      expect(isConnected()).toBe(false);
    });
  });

  describe('getConnectionState', () => {
    it('should return "disconnected" for state 0', () => {
      mongoose.connection.readyState = 0;
      expect(getConnectionState()).toBe('disconnected');
    });

    it('should return "connected" for state 1', () => {
      mongoose.connection.readyState = 1;
      expect(getConnectionState()).toBe('connected');
    });

    it('should return "connecting" for state 2', () => {
      mongoose.connection.readyState = 2;
      expect(getConnectionState()).toBe('connecting');
    });

    it('should return "disconnecting" for state 3', () => {
      mongoose.connection.readyState = 3;
      expect(getConnectionState()).toBe('disconnecting');
    });

    it('should return "unknown" for invalid state', () => {
      mongoose.connection.readyState = 99;
      expect(getConnectionState()).toBe('unknown');
    });
  });

  describe('setupConnectionHandlers', () => {
    it('should set up event handlers without errors', () => {
      mongoose.connection.on = jest.fn();
      process.on = jest.fn();
      
      setupConnectionHandlers();
      
      expect(mongoose.connection.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mongoose.connection.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });
});
