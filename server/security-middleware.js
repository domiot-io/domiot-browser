/**
 * Proposed Security Middleware
 * 
 * securityMiddleware function validates the paths of the drivers
 * and the messages read and written to the drivers.
 * 
 * This is the proposed default security middleware.
 * You can use it as a starting point to implement
 * your own security middleware. If you use a custom
 * security middleware, don't forget to update the
 * config.securityMiddleware property in the config.js file.
 */


/**
 * Main security middleware function
 * @param {string} location - optional Driver location/path
 * @param {string} message - Optional message to validate
 * @returns {Object} - Validation result with valid flag and optional error
 */
function securityMiddleware(location, message = null) {
  
  // Validate location
  if (!isPathAllowed(location)) {
    return {
      valid: false,
      error: `Access denied: Driver location '${location}' is not in the allowed paths whitelist`
    };
  }


  ///////////////////////////////////////
  // message validation rules here if needed
  ///////////////////////////////////////

  return { valid: true };
}


const fs = require('fs');
const path = require('path');

// Global state for allowed paths
let allowedPaths = [];
const whitelistPath = path.join(__dirname, 'allowed-paths');


/**
 * Load whitelist from file
 */
function loadWhitelist() {
  try {
    if (fs.existsSync(whitelistPath)) {
      const content = fs.readFileSync(whitelistPath, 'utf8');
      allowedPaths = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')); // Remove empty lines and comments
      
      console.log(`Whitelist file: ${whitelistPath}`);
      console.log(`${allowedPaths.length} patterns loaded:`);
      allowedPaths.forEach(pattern => {
        console.log(`- ${pattern}`);
      });
    } else {
      console.warn(`Whitelist file not found: ${whitelistPath}`);
      console.warn('Using restrictive whitelist: deny all by default');
      allowedPaths = [];
    }
  } catch (error) {
    console.error(`Error loading whitelist: ${error.message}`);
    console.warn('Using restrictive whitelist: deny all by default');
    allowedPaths = [];
  }
}

/**
 * Pattern matching.
 * @param {string} targetPath - The path to test
 * @param {string} pattern - The pattern to match against
 * @returns {boolean} - True if path matches pattern
 */
function matchesPattern(targetPath, pattern) {

  if (pattern === '*') {
    return true;
  }

  if (!pattern.includes('*')) {
    return targetPath === pattern;
  }

  const parts = pattern.split('*').filter(part => part !== ''); // Remove empty parts
  
  if (parts.length === 0) {
    return true;
  }
  
  let currentIndex = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const foundIndex = targetPath.indexOf(part, currentIndex);
    
    if (foundIndex === -1) {
      return false;
    }
    
    if (i === 0 && !pattern.startsWith('*') && foundIndex !== 0) {
      return false;
    }
    
    currentIndex = foundIndex + part.length;
  }
  
  const lastPart = parts[parts.length - 1];
  if (!pattern.endsWith('*') && currentIndex !== targetPath.length) {
    return false;
  }
  
  return true;
}

/**
 * Check if a path matches any of the whitelist patterns
 * @param {string} targetPath - The path to validate
 * @returns {boolean} - True if path is allowed
 */
function isPathAllowed(targetPath) {
  if (!targetPath) {
    return false;
  }

  for (const pattern of allowedPaths) {
    if (matchesPattern(targetPath, pattern)) {
      return true;
    }
  }

  return false;
}

// Load initial whitelist
loadWhitelist();

module.exports = { 
  securityMiddleware
}; 