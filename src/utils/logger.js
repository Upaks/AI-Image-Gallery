/**
 * Enterprise-grade logging utility
 * Replaces console.log/error with structured logging
 * In production, these can be sent to a logging service (e.g., Sentry, LogRocket)
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

const CURRENT_LEVEL = import.meta.env.PROD 
  ? LOG_LEVELS.ERROR  // Only errors in production
  : LOG_LEVELS.DEBUG  // All logs in development

/**
 * Create a log entry
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Log message
 * @param {object} context - Additional context/data
 */
const createLogEntry = (level, message, context = {}) => {
  return {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...context,
  }
}

/**
 * Log debug information (development only)
 */
export const logDebug = (message, context = {}) => {
  if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
    const entry = createLogEntry('debug', message, context)
    console.debug('[DEBUG]', entry)
  }
}

/**
 * Log informational messages
 */
export const logInfo = (message, context = {}) => {
  if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
    const entry = createLogEntry('info', message, context)
    console.info('[INFO]', entry)
    // In production, send to logging service
    // sendToLoggingService(entry)
  }
}

/**
 * Log warnings
 */
export const logWarn = (message, context = {}) => {
  if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
    const entry = createLogEntry('warn', message, context)
    console.warn('[WARN]', entry)
    // In production, send to logging service
    // sendToLoggingService(entry)
  }
}

/**
 * Log errors (always logged)
 */
export const logError = (message, error = null, context = {}) => {
  const entry = createLogEntry('error', message, {
    ...context,
    error: error ? {
      message: error.message,
      stack: import.meta.env.DEV ? error.stack : undefined, // Stack only in dev
      name: error.name,
    } : undefined,
  })
  
  console.error('[ERROR]', entry)
  
  // In production, send to error tracking service (e.g., Sentry)
  // if (import.meta.env.PROD) {
  //   sendToErrorTrackingService(entry, error)
  // }
}

