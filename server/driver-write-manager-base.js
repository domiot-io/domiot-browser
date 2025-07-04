/**
 * DriverWriteManagerBase
 * Abstract base class for driver write managers in the BDCOM server.
 * 
 * This class defines the interface that all driver write managers must implement
 * for writing data to drivers with.
 * 
 * @abstract
 * @class DriverWriteManagerBase
 */
class DriverWriteManagerBase {
  /**
   * Creates a new driver write manager instance.
   * 
   * @param {Object} streamingConfig - Configuration object for streaming retry strategies.
   */
  constructor(streamingConfig = {}) {
    this.streamingConfig = streamingConfig;
  }

  /**
   * Writes a message to a driver at the specified location.
   * 
   * This method must be implemented by concrete subclasses to handle the
   * platform-specific details of writing to drivers.
   * 
   * @abstract
   * @param {string} driverLocation - reference to the driver.
   * @param {string} message - Message to write to the driver.
   * @param {Function} onFinish - Callback function called when write completes successfully.
   * @param {Function} onError - Callback function called when write fails.
   */
  writeToDriver(driverLocation, message, onFinish, onError) {
    throw new Error('writeToDriver method must be implemented by subclasses');
  }
}

module.exports = DriverWriteManagerBase; 