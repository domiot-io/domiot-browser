/**
 * DriverReadManagerBase
 * Abstract base class for driver read managers in the BDCOM server.
 * 
 * This class defines the interface that all driver read managers must implement
 * for reading data from drivers.
 * 
 * Driver read managers handle continuous reading from drivers and distribute
 * the data to subscribed WebSocket clients.
 * 
 * @abstract
 * @class DriverReadManagerBase
 */
class DriverReadManagerBase {
  /**
   * Creates a new driver read manager instance.
   * 
   * @param {Object} streamingConfig - Configuration object for streaming retry strategies.
   * @param {Object} subscriptionManager - Manager for client subscriptions to topics.
   * @param {Object} clientRegistry - Registry of connected WebSocket clients.
   */
  constructor(streamingConfig = {}, subscriptionManager, clientRegistry) {
    this.subscriptionManager = subscriptionManager;
    this.clientRegistry = clientRegistry;
    this.streamingConfig = streamingConfig;
  }

  /**
   * Starts continuous reading from a driver location for a specific topic.
   * 
   * This method must be implemented by concrete subclasses to handle the
   * platform-specific details of reading from drivers.
   * 
   * @abstract
   * @param {string} topic - The topic identifier for this reading operation
   * @param {string} driverLocation - Reference to the driver.
   */
  startTopicReading(topic, driverLocation, pollInterval) { 
    throw new Error('startTopicReading method must be implemented by subclasses'); 
  }

  /**
   * Stops reading from a driver for a specific topic.
   * 
   * This method must be implemented by concrete subclasses to handle the
   * platform-specific details of stopping driver reads and cleanup.
   * 
   * @abstract
   * @param {string} topic - The topic identifier to stop reading
   */
  stopTopicReading(topic) { 
    throw new Error('stopTopicReading method must be implemented by subclasses'); 
  }
}

module.exports = DriverReadManagerBase; 