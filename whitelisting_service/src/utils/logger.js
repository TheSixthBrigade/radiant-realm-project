import winston from 'winston';
import path from 'path';

/**
 * Centralized logging utility for the Discord Roblox Whitelist Bot
 * Provides structured logging with different levels and transports
 */

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Log colors for console output
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(LOG_COLORS);

/**
 * Custom format for console output
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

/**
 * Custom format for file output
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create logger instance
 */
const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join('./logs', 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join('./logs', 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Console output
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join('./logs', 'exceptions.log'),
      maxsize: 10485760,
      maxFiles: 3
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join('./logs', 'rejections.log'),
      maxsize: 10485760,
      maxFiles: 3
    })
  ]
});

/**
 * Log redemption attempt
 */
export function logRedemption(discordUserId, robloxUsername, success, details = {}) {
  logger.info('Redemption attempt', {
    event: 'REDEMPTION',
    discord_user_id: discordUserId,
    roblox_username: robloxUsername,
    success,
    ...details
  });
}

/**
 * Log security event
 */
export function logSecurityEvent(eventType, severity, details = {}) {
  const logLevel = severity === 'HIGH' || severity === 'CRITICAL' ? 'warn' : 'info';
  
  logger[logLevel]('Security event', {
    event: 'SECURITY',
    event_type: eventType,
    severity,
    ...details
  });
}

/**
 * Log API interaction
 */
export function logApiCall(service, endpoint, success, details = {}) {
  logger.http('API call', {
    event: 'API_CALL',
    service,
    endpoint,
    success,
    ...details
  });
}

/**
 * Log Discord bot event
 */
export function logBotEvent(eventType, details = {}) {
  logger.info('Bot event', {
    event: 'BOT_EVENT',
    event_type: eventType,
    ...details
  });
}

/**
 * Log error with stack trace
 */
export function logError(error, context = {}) {
  logger.error('Error occurred', {
    event: 'ERROR',
    error_message: error.message,
    error_stack: error.stack,
    ...context
  });
}

/**
 * Log warning
 */
export function logWarning(message, details = {}) {
  logger.warn(message, {
    event: 'WARNING',
    ...details
  });
}

/**
 * Log debug information
 */
export function logDebug(message, details = {}) {
  logger.debug(message, {
    event: 'DEBUG',
    ...details
  });
}

/**
 * Create child logger with default metadata
 */
export function createChildLogger(defaultMetadata = {}) {
  return logger.child(defaultMetadata);
}

export default logger;