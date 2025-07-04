const { File } = require('keep-streaming');
const DriverWriteManagerBase = require('./driver-write-manager-base');

/**
 * DriverWriteManagerUnix
 * Unix/Linux implementation of driver write manager for the BDCOM server.
 * 
 * This class implements writing to Unix device files.
 * 
 * @class DriverWriteManagerUnix
 * @extends DriverWriteManagerBase
 */
class DriverWriteManagerUnix extends DriverWriteManagerBase {

  /**
   * Writes a message to a Unix device file.
   * 
   * This method writes the specified message to a Unix device file (driver)
   * 
   * @param {string} driverLocation - Path to the Unix device file (e.g., /dev/ohubx24-sim0)
   * @param {string} message - Message to write to the driver
   * @param {Function} onFinish - Callback function called when write completes successfully
   * @param {Function} onError - Callback function called when write fails
   */
  writeToDriver(driverLocation, message, onFinish, onError) {
    const fileOptions = {};
    if (this.streamingConfig.writeFileExistsRetryStrategy) {
      fileOptions.writeFileExistsRetryStrategy = this.streamingConfig.writeFileExistsRetryStrategy;
    }
    if (this.streamingConfig.writeFileRetryStrategy) {
      fileOptions.writeFileRetryStrategy = this.streamingConfig.writeFileRetryStrategy;
    }
    const file = new File(driverLocation, fileOptions);

    file.prepareWrite(message + '\r\n')
      .onFinish(() => { 
        onFinish(); 
      })
      .onError((error) => {
        console.error(`Write failed to ${driverLocation}:`, error);
        onError(error);
      })
      .write();
  }
}

module.exports = DriverWriteManagerUnix; 