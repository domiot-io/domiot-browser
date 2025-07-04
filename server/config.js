// config/config.js
// Contains the configuration for the server,
// the security middleware and the streaming configuration

// Security middleware
const { securityMiddleware } = require('./security-middleware');

module.exports = {
  // WebSocket server port (defaults to 8080 if not provided)
  // port: 8080,
  
  // Security validation for driver access (CRITICAL: bypasses all security if not provided)
  securityMiddleware: securityMiddleware,
  
  // Optional streaming configuration for keep-streaming library (uses defaults if not provided)
  streaming: {
    // readTimeout: 0,                        // Optional Read timeout in ms. 0 = disabled (default). Missing = uses 0.
    // readFileExistsRetryStrategy: undefined, // Optional Custom retry for file existence before read. Missing = uses library default.
    // writeFileExistsRetryStrategy: undefined,// OptionalCustom retry for file existence before write. Missing = uses library default.
    // readFileRetryStrategy: undefined,      // Optional Custom retry for read failures. Missing = uses library default.
    // writeFileRetryStrategy: undefined      // Optional Custom retry for write failures. Missing = uses library default.
  }
}; 