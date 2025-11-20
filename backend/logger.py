"""
Enterprise-grade logging utility for backend
Follows best practices: structured logging, no sensitive data exposure
"""
import logging
import os
from datetime import datetime

# Configure logging based on environment
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development") == "production"

# Create logger
logger = logging.getLogger("ai_image_gallery")
logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

# Create console handler with formatting
handler = logging.StreamHandler()
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
handler.setFormatter(formatter)
logger.addHandler(handler)

def log_info(message: str, **context):
    """Log informational messages"""
    context_str = f" | {context}" if context else ""
    logger.info(f"{message}{context_str}")

def log_warn(message: str, **context):
    """Log warning messages"""
    context_str = f" | {context}" if context else ""
    logger.warning(f"{message}{context_str}")

def log_error(message: str, error: Exception = None, **context):
    """Log error messages (never expose sensitive data)"""
    context_str = f" | {context}" if context else ""
    error_info = f" | Error: {type(error).__name__}: {str(error)}" if error else ""
    
    # In production, don't log full stack traces to console
    if IS_PRODUCTION and error:
        logger.error(f"{message}{context_str}{error_info}")
    else:
        logger.error(f"{message}{context_str}{error_info}", exc_info=error)

def log_debug(message: str, **context):
    """Log debug messages (development only)"""
    if not IS_PRODUCTION:
        context_str = f" | {context}" if context else ""
        logger.debug(f"{message}{context_str}")

def safe_log_api_key(key: str = None) -> str:
    """
    Safely log API key status without exposing the key
    Returns a safe representation for logging
    """
    if not key:
        return "Not configured"
    
    # Never log actual key, only status
    return "Configured" if key else "Not configured"

