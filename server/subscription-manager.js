// Subscription Manager
// This class is used to manage the subscriptions
// of the clients to the topics
// Topic names in general correspond to the driver location.
class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map(); // topic -> Map of (clientId+bindingId -> {clientId, bindingId})
    this.clientSubscriptions = new Map(); // clientId -> Map of (bindingId -> topic)
  }
  
  subscribe(clientId, topic, bindingId) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Map());
    }
    const subscriptionKey = `${clientId}:${bindingId}`;
    const wasEmpty = this.subscriptions.get(topic).size === 0;
    this.subscriptions.get(topic).set(subscriptionKey, { clientId, bindingId });
    
    if (!this.clientSubscriptions.has(clientId)) {
      this.clientSubscriptions.set(clientId, new Map());
    }
    this.clientSubscriptions.get(clientId).set(bindingId, topic);
    
    return wasEmpty;
  }
  
  unsubscribe(clientId, topic, bindingId) {
    const subscriptionKey = `${clientId}:${bindingId}`;
    
    if (this.subscriptions.has(topic)) {
      this.subscriptions.get(topic).delete(subscriptionKey);
      if (this.subscriptions.get(topic).size === 0) {
        this.subscriptions.delete(topic);
        return true;
      }
    }
    
    if (this.clientSubscriptions.has(clientId)) {
      this.clientSubscriptions.get(clientId).delete(bindingId);
    }
    
    return false;
  }
  
  publish(topic, data) {
    const topicSubscriptions = this.subscriptions.get(topic);
    if (!topicSubscriptions) return [];
    
    const subscribers = [];
    for (const subscription of topicSubscriptions.values()) {
      if (!subscribers.includes(subscription.clientId)) {
        subscribers.push(subscription.clientId);
      }
    }
    return subscribers;
  }
  
  cleanupClient(clientId) {
    const clientSubs = this.clientSubscriptions.get(clientId) || new Map();
    const emptyTopics = [];
    
    for (const [bindingId, topic] of clientSubs) {
      if (this.unsubscribe(clientId, topic, bindingId)) {
        emptyTopics.push(topic);
      }
    }
    
    this.clientSubscriptions.delete(clientId);
    return emptyTopics;
  }
}

module.exports = { SubscriptionManager }; 