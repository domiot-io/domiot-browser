/**
 * WebSocket Message Router
 * 
 * This class is used to route the messages
 * to the appropriate handler.
 */
class MessageRouter {
  constructor(subscriptionManager, readerManager, writeManager, securityMiddleware) {
    this.subscriptionManager = subscriptionManager;
    this.readerManager = readerManager;
    this.writeManager = writeManager;
    this.securityMiddleware = securityMiddleware;
  }
  
  route(client, message) {
    try {
      const parsed = JSON.parse(message);
      
      switch (parsed.type) {
        case 'subscribe':
          this.handleSubscribe(client, parsed);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(client, parsed);
          break;
        case 'write':
          this.handleWrite(client, parsed);
          break;
        default:
          this.sendError(client, parsed.id, `Unknown message type: ${parsed.type}`);
      }
    } catch (error) {
      console.error('Message parsing error:', error);
      this.sendError(client, null, 'Invalid JSON message');
    }
  }
  
  handleSubscribe(client, message) {
    const { topic, bindingLocation, bindingId } = message.data;
    const driverLocation = bindingLocation || topic;
    
    ///////////////////////////////////////
    // /!\ Security validation           //
    // using function-based middleware   //
    ///////////////////////////////////////
    if (this.securityMiddleware) {
      const validation = this.securityMiddleware(topic);
      if (!validation.valid) {
        this.sendError(client, message.id, validation.error);
        return;
      }
    }
    ///////////////////////////////////////
    
    const isFirstSubscriber = this.subscriptionManager.subscribe(client.id, topic, bindingId);
    
    // Start persistent reader only if this is the first subscriber
    if (isFirstSubscriber) {
      this.readerManager.startTopicReading(topic, driverLocation);
    }
    
    // Send acknowledgment with bindingId (use subscribeAck to match client expectations)
    client.send(JSON.stringify({
      type: 'subscribeAck',
      id: message.id,
      timestamp: new Date().toISOString(),
      data: { 
        topic, 
        driverLocation,
        bindingId
      }
    }));
  }
  
  handleUnsubscribe(client, message) {
    const { topic, bindingId } = message.data;
    const isLastSubscriber = this.subscriptionManager.unsubscribe(client.id, topic, bindingId);
    
    // Stop persistent reader only if this was the last subscriber
    if (isLastSubscriber) {
      this.readerManager.stopTopicReading(topic);
    }
  }
  
  handleWrite(client, message) {
    const { bindingLocation, message: driverMessage, bindingId } = message.data;
    
    // Security validation (if middleware provided)
    if (this.securityMiddleware) {
      const validation = this.securityMiddleware(bindingLocation, driverMessage);
    if (!validation.valid) {
      this.sendError(client, message.id, validation.error);
      return;
      }
    }
    
    // Perform one-time write operation
    this.writeManager.writeToDriver(
      bindingLocation,
      driverMessage,
      () => {
        // onFinish callback (use writeAck to match client expectations)
        client.send(JSON.stringify({
          type: 'writeAck',
          id: message.id,
          timestamp: new Date().toISOString(),
          data: {
            success: true,
            bindingLocation,
            message: driverMessage,
            bindingId
          }
        }));
      },
      (error) => {
        // onError callback (use writeAck to match client expectations)
        client.send(JSON.stringify({
          type: 'writeAck',
          id: message.id,
          timestamp: new Date().toISOString(),
          data: {
            success: false,
            bindingLocation,
            error: error.message,
            bindingId
          }
        }));
      }
    );
  }
  
  sendError(client, messageId, error) {
    client.send(JSON.stringify({
      type: 'error',
      id: messageId,
      timestamp: new Date().toISOString(),
      data: { error }
    }));
  }
}

module.exports = { MessageRouter }; 
