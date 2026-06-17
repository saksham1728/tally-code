/**
 * Logger Module
 * 
 * File-based logging with rotation using Winston
 */

const winston = require('winston');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

class Logger {
  constructor() {
    // Create logs directory
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Create Winston logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // File transport - rotating logs
        new winston.transports.File({
          filename: path.join(logDir, 'app.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        // Error-only file
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 3
        })
      ]
    });
    
    // Console transport for development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
    
    this.info('Logger initialized', { logDir });
  }
  
  /**
   * Log info message
   * @param {string} message 
   * @param {Object} meta 
   */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }
  
  /**
   * Log error message
   * @param {string} message 
   * @param {Object} meta 
   */
  error(message, meta = {}) {
    this.logger.error(message, meta);
  }
  
  /**
   * Log warning message
   * @param {string} message 
   * @param {Object} meta 
   */
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }
  
  /**
   * Log debug message
   * @param {string} message 
   * @param {Object} meta 
   */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }
  
  /**
   * Set log level
   * @param {string} level - error, warn, info, debug
   */
  setLevel(level) {
    this.logger.level = level;
    this.info('Log level changed', { level });
  }
}

module.exports = Logger;
