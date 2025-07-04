/**
 * BindingDriverCom - Class for Binding-to-Driver Communication using WebSocket.
 */
class BindingDriverCom {
    /**
     * @param {string} wsAddress WebSocket server address
     */
    constructor(wsAddress = 'ws://localhost:8080') {
        this.wsAddress = wsAddress;
        this.ws = null;
        this.subscriptions = new Map();
        this.topicToBindings = new Map(); // Reverse lookup: topic -> Set of bindingIds
        this.isManualDisconnect = false;
        this.reconnectTimer = null;
        this.reconnectDelay = 1000;
    }

    /**
     * Establishes WebSocket connection with auto-reconnection.
     */
    connect() {
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.ws = new WebSocket(this.wsAddress);

        this.ws.onopen = () => {
            // Automatically resubscribe to all existing subscriptions
            this.resubscribeAll();
        };

        this.ws.onmessage = (event) => {
            try {
                const wsMessage = JSON.parse(event.data);
                this.handleMessage(wsMessage);
            } catch (error) {
                console.error('Error parsing message: ' + error.message);
            }
        };

        this.ws.onclose = () => {
            // Only reconnect if it wasn't a manual disconnect
            if (!this.isManualDisconnect) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error: ' + error.message);
            // Trigger reconnect on connection error (if not manual disconnect)
            if (!this.isManualDisconnect) {
                // Close the WebSocket to trigger onclose which will handle reconnection
                if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
                    this.ws.close();
                } else {
                    // If already closed, directly schedule reconnect
                    this.scheduleReconnect();
                }
            }
        };
    }

    /**
     * Closes connection and stops auto-reconnection.
     */
    disconnect() {
        this.isManualDisconnect = true;
        
        // Clear any pending reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.ws) {
            this.ws.close();
        }
    }

    /**
     * Schedules reconnection attempt after delay.
     * @private
     */
    scheduleReconnect() {
        if (this.isManualDisconnect) {
            return;
        }
        
        this.reconnectTimer = setTimeout(() => {
            if (!this.isManualDisconnect) {
                this.connect();
            }
        }, this.reconnectDelay);
    }

    /**
     * Resubscribes to all stored subscriptions after reconnection.
     * @private
     */
    resubscribeAll() {
        if (this.subscriptions.size === 0) {
            return;
        }
        
        for (const [bindingId, topic] of this.subscriptions) {
            const bindingEl = document.getElementById(bindingId);
            if (bindingEl) {
                // Resubscribe using the stored topic and binding element
                const wsMessage = {
                    type: 'subscribe',
                    data: {
                        topic: topic,
                        bindingId: bindingId
                    }
                };
                
                this.ws.send(JSON.stringify(wsMessage));
            } else {
                // Remove subscription if binding element no longer exists
                this.subscriptions.delete(bindingId);
                // Clean up reverse lookup
                const bindings = this.topicToBindings.get(topic);
                if (bindings) {
                    bindings.delete(bindingId);
                    if (bindings.size === 0) {
                        this.topicToBindings.delete(topic);
                    }
                }
            }
        }
    }

    /**
     * Subscribes binding element to read from driver location.
     * @param {HTMLElement} bindingEl Binding element with location attribute
     */
    subscribeRead(bindingEl) {
        const location = bindingEl.getAttribute('location');
        if (!location) return;
        
        this.subscriptions.set(bindingEl.id, location);
        
        // Update reverse lookup
        if (!this.topicToBindings.has(location)) {
            this.topicToBindings.set(location, new Set());
        }
        this.topicToBindings.get(location).add(bindingEl.id);
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('Connecting to server...');
            return;
        }

        const wsMessage = {
            type: 'subscribe',
            data: {
                topic: location,
                bindingId: bindingEl.id
            }
        };

        this.ws.send(JSON.stringify(wsMessage));
    }

    /**
     * Unsubscribes binding element from driver location.
     * @param {HTMLElement} bindingEl Binding element to unsubscribe
     */
    unsubscribeRead(bindingEl) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('Not connected to server');
            return;
        }

        const location = bindingEl.getAttribute('location');
        if (!location) return;

        const wsMessage = {
            type: 'unsubscribe',
            data: {
                topic: location,
                bindingId: bindingEl.id
            }
        };

        this.ws.send(JSON.stringify(wsMessage));
        this.subscriptions.delete(bindingEl.id);
        
        // Clean up reverse lookup
        const bindings = this.topicToBindings.get(location);
        if (bindings) {
            bindings.delete(bindingEl.id);
            if (bindings.size === 0) {
                this.topicToBindings.delete(location);
            }
        }
    }

    /**
     * Writes message to driver.
     * @param {HTMLElement} bindingEl Binding element with location attribute
     * @param {string} message Message to write to driver
     */
    write(bindingEl, message) {
        if (!message) {
            return;
        }

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('Not connected to server');
            return;
        }

        const location = bindingEl.getAttribute('location');
        if (!location) {
            return;
        }

        const wsMessage = {
            type: 'write',
            data: {
                bindingLocation: location,
                message: message.trim(),
                bindingId: bindingEl.id
            }
        };

        this.ws.send(JSON.stringify(wsMessage));
    }

    /**
     * Routes incoming WebSocket messages to appropriate handlers.
     * @param {Object} wsMessage Parsed WebSocket message
     * @private
     */
    handleMessage(wsMessage) {
        switch (wsMessage.type) {
            case 'read':
                const bindingIds = this.findAllBindingsByTopic(wsMessage.data.topic);
                if (bindingIds.length > 0) {
                    bindingIds.forEach(bindingId => {
                        const bindingEl = document.getElementById(bindingId);
                        if (bindingEl) {
                        bindingEl.onData(null, wsMessage.data.value);
                        }
                    });
                }
                break;

            case 'change':
                if (wsMessage.data.error) {
                    console.error(`Driver error: ${wsMessage.data.error}`);
                }
                break;

            case 'error':
                console.error(`Error: ${wsMessage.data.error}`);
                break;
        }
    }

    /**
     * Gets all binding IDs subscribed to a topic.
     * @param {string} topic Driver topic/location
     * @returns {string[]} Array of binding element IDs
     * @private
     */
    findAllBindingsByTopic(topic) {
        const bindings = this.topicToBindings.get(topic);
        return bindings ? Array.from(bindings) : [];
    }
} 