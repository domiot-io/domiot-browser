
const WebSocket = require('ws');
const { File } = require('keep-streaming');
const DriverReadManagerBase = require('./driver-read-manager-base');

/**
 * DriverReadManagerUnix
 * Unix/Linux implementation of driver read manager for the BDCOM server.
 * 
 * This class implements continuous reading from Unix device files (e.g., /dev/ihubx24-sim0)
 * and distributes data to subscribed WebSocket clients.
 * 
 * @class DriverReadManagerUnix
 * @extends DriverReadManagerBase
 */
class DriverReadManagerUnix extends DriverReadManagerBase {

  constructor(streamingConfig = {}, subscriptionManager, clientRegistry) {
    super(streamingConfig, subscriptionManager, clientRegistry);
    this.topicReaders = new Map();
  }
  startTopicReading(topic, driverLocation, pollInterval = 1000) {
    // Avoid duplicate readers for the same topic
    if (this.topicReaders.has(topic)) {
      return;
    }
    
    const fileOptions = { readTimeout: 0 };
    if (this.streamingConfig.readTimeout !== undefined) {
      fileOptions.readTimeout = this.streamingConfig.readTimeout;
    }
    if (this.streamingConfig.readFileExistsRetryStrategy) {
      fileOptions.readFileExistsRetryStrategy = this.streamingConfig.readFileExistsRetryStrategy;
    }
    if (this.streamingConfig.readFileRetryStrategy) {
      fileOptions.readFileRetryStrategy = this.streamingConfig.readFileRetryStrategy;
    }
    const file = new File(driverLocation, fileOptions);
    const readerState = { file, isReading: false, finishCallback: null };
    this.topicReaders.set(topic, readerState);
    
    this.startContinuousReading(topic, readerState, pollInterval);
  }
  startContinuousReading(topic, readerState, pollInterval) {
    if (readerState.isReading) return;
    readerState.isReading = true;
    readerState.file.prepareRead()
      .onData((chunk, finish) => {
        readerState.finishCallback = finish;
        this.onDriverData(topic, chunk);
        if (!this.topicReaders.has(topic)) {
          finish();
        }
      })
      .onFinish(() => {
        if (this.topicReaders.has(topic)) {
          this.topicReaders.get(topic).isReading = false;
          this.topicReaders.get(topic).finishCallback = null;
          setTimeout(() => {
            if (this.topicReaders.has(topic)) {
              this.startContinuousReading(topic, this.topicReaders.get(topic), pollInterval);
            }
          }, pollInterval);
        }
      })
      .onError((error) => {
        console.error(`Driver read error for topic ${topic}:`, error);
        this.onDriverError(topic, error);
        if (this.topicReaders.has(topic)) {
          this.topicReaders.get(topic).isReading = false;
          this.topicReaders.get(topic).finishCallback = null;
          setTimeout(() => {
            if (this.topicReaders.has(topic)) {
              this.startContinuousReading(topic, this.topicReaders.get(topic), pollInterval);
            }
          }, pollInterval);
        }
      })
      .read();
  }
  stopTopicReading(topic) {
    const readerState = this.topicReaders.get(topic);
    if (readerState) {
      readerState.isReading = false;
      if (readerState.finishCallback) {
        try {
          readerState.finishCallback();
        } catch (error) {
          console.warn(`Warning: Error while finishing reader for topic ${topic}:`, error.message);
        }
      }
      this.topicReaders.delete(topic);
    }
  }
  onDriverData(topic, data) {
    const subscribers = this.subscriptionManager.publish(topic, data);
    if (subscribers.length === 0) {
      this.stopTopicReading(topic);
      return;
    }
    const message = {
      type: 'read',
      id: `pub_${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: { topic, value: data }
    };
    subscribers.forEach(clientId => {
      const client = this.clientRegistry.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  onDriverError(topic, error) {
    const subscribers = this.subscriptionManager.publish(topic, null);
    const errorMessage = {
      type: 'change',
      id: `err_${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: { topic, state: 'error', error: error.message }
    };
    subscribers.forEach(clientId => {
      const client = this.clientRegistry.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(errorMessage));
      }
    });
  }
}

module.exports = DriverReadManagerUnix; 