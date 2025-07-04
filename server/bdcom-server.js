/**
 * Binding-Driver Communication Server
 * 
 * This server is used to allow bindings to communicate with the drivers.
 * Used to subscribe to drivers'data (read) and to publish data to the drivers (write)
 */

const WebSocket = require('ws');
const { SubscriptionManager } = require('./subscription-manager');
const DriverReadManagerUnix = require('./driver-read-manager-unix');
const DriverWriteManagerUnix = require('./driver-write-manager-unix');
const { MessageRouter } = require('./message-router');

// config/config.js
// Contains the configuration for the server,
// the security middleware and the streaming configuration
const config = require('./config');

const clientRegistry = new Map();
const subscriptionManager = new SubscriptionManager();
const readerManager = new DriverReadManagerUnix(config.streaming, subscriptionManager, clientRegistry);
const writeManager = new DriverWriteManagerUnix(config.streaming);
const messageRouter = new MessageRouter(subscriptionManager, readerManager, writeManager, config.securityMiddleware);

////////////////////////////////////////////////////////////
// Initialize the WebSocket server
////////////////////////////////////////////////////////////
const port = config.port || 8080;
const wss = new WebSocket.Server({ port: port });
let clientIdCounter = 0;

wss.on('connection', (ws) => {
  const clientId = `client_${++clientIdCounter}`;
  ws.id = clientId;
  clientRegistry.set(clientId, ws);
  
  // Send connection established message
  ws.send(JSON.stringify({
    type: 'connectionAck',
    id: `conn_${Date.now()}`,
    timestamp: new Date().toISOString(),
    data: { clientId }
  }));
  
  ws.on('message', (message) => {
    messageRouter.route(ws, message);
  });
  
  ws.on('close', () => {
    const emptyTopics = subscriptionManager.cleanupClient(clientId);
    emptyTopics.forEach(topic => {
      readerManager.stopTopicReading(topic);
    });
    
    clientRegistry.delete(clientId);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

wss.on('listening', () => {
  console.log(`BDCOM WebSocket Server running on ws://localhost:${port}`);
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

////////////////////////////////////////////////////////////
// Shutdown the server
////////////////////////////////////////////////////////////
let isShuttingDown = false;

function gracefulShutdown(signal) {
  // Prevent multiple shutdown calls
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  
  console.log(`\nShutting down BDCOM WebSocket Server (${signal}), it could take a few seconds ...`);
  
  // Set a maximum timeout for shutdown
  const shutdownTimeout = setTimeout(() => {
    console.log('Shutdown timeout reached, forcing exit...');
    process.abort();
  }, 5000);
  
  try {
    for (const [topic] of readerManager.topicReaders) {
      readerManager.stopTopicReading(topic);
    }
  } catch (error) {
    console.error('Error stopping topic readers:', error.message);
  }
  
  wss.close((error) => {    
    if (error) {
      console.error('Error closing WebSocket server:', error.message);
      process.abort();
    } else {
      console.log('BDCOM WebSocket Server stopped.');
      process.exit(0);
    }
  });
}

// Handle both SIGINT and SIGTERM with the same shutdown function
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));