/**
 * Collection of HTMLElement classes.
 */
class HTMLElementCollection {
    
    constructor(){
        this._obj = {};
    }

    /**
     * Validates if class extends HTMLElement.
     * @param {Function} elementClass Class to validate
     * @returns {boolean} True if valid HTMLElement subclass
     * @private
     */
    _isHTMLElementSubclass(elementClass) {
        return typeof elementClass === 'function' && elementClass.prototype instanceof HTMLElement;
    }

    /**
     * Adds custom element class to collection.
     * @param {string} tagName Custom element tag name (e.g., 'iot-button')
     * @param {Function} elementClass HTMLElement subclass
     * @throws {Error} If parameters are invalid
     */
    add(tagName, elementClass){
        if (!tagName || typeof tagName !== 'string') {
            throw new Error(`Mandatory 'tagName' of type string when adding a new element to HTMLElementCollection.`);
        }

        if (!elementClass || !this._isHTMLElementSubclass(elementClass)) {
            throw new Error(`Only objects of type HTMLElement are allowed in HTMLElementCollection.`);
        }
        
        this._obj[tagName] = elementClass;
    }

    /**
     * Removes element class from collection.
     * @param {string} tagName Tag name to remove
     */
    remove(tagName){
        delete this._obj[tagName];
    }

    /**
     * Gets element class from collection.
     * @param {string} tagName Tag name to retrieve
     * @returns {Function} Element class or undefined
     */
    get(tagName){
        return this._obj[tagName];
    }

    /**
     * Makes collection iterable.
     * @returns {Iterator} Iterator [tagName, elementClass]
     */
    [Symbol.iterator]() {
        const keys = Object.keys(this._obj);
        let index = 0;
        const obj = this._obj;

        return {
            next() {
                if (index < keys.length) {
                    const key = keys[index++];
                    return { value: [key, obj[key]], done: false };
                }
                return { done: true };
            }
        };
    }
}


// DOMIoT Browser
// Binding setup and hooks for attribute and style changes.
const DOMIoT = function(elementClassCollections=[], bdcomAddress='ws://localhost:8080') {
    
    // Validate and normalize parameters
    if (elementClassCollections) {
        if (elementClassCollections instanceof HTMLElementCollection) {
            elementClassCollections = [elementClassCollections];
        } else {
            // Validate array of collections
            let isTypeCorrect = true;

            if (!Array.isArray(elementClassCollections)){
                isTypeCorrect = false;
            } else {
                for (let i = 0; i < elementClassCollections.length; i++) {
                    const collection = elementClassCollections[i];
                    if (!(collection instanceof HTMLElementCollection)) {
                        isTypeCorrect = false;
                        break;
                    }
                }
            }

            if (!isTypeCorrect) {
                throw new Error('DOMIoT second constructor argument `elementFactoryCollection` must be of type HTMLElementFactoryCollection or Array of HTMLElementFactoryCollection.');
            }
        }
    }

    // Initialize Binding-to-Driver Communication
    const bdcom = new BindingDriverCom(bdcomAddress);
    bdcom.connect();
    
    _init();

    /**
     * Initializes DOMIoT system components.
     * @private
     */
    function _init() {
        if (elementClassCollections) {
            _addIoTElements(elementClassCollections);
        }

        _setBindingHooks();
        _setBindings();
    
        // Process existing style attributes
        const elsWithStyle = document.querySelectorAll('[style]');
        for (const el of elsWithStyle) {
            _elementStyleAttributeSet(el, el.style);
        }
    }

    /**
     * Notifies binding elements of attribute changes.
     * @param {Element} el Changed element
     * @param {string} attributeName Attribute name
     * @param {string} attributeValue New value
     * @param {string} oldValue Previous value
     * @private
     */
    function _notifyAttributeModificationToBinding(el, attributeName, attributeValue, oldValue) {
        const binding = el.getAttribute('binding');
        if (!binding) return;
        
        const splittedBinding = binding.split(' ');
        splittedBinding.forEach((idAndIndex) => {
            const [bindingEl, index] = _getBindingAndIndex(idAndIndex, el);
            if (bindingEl && bindingEl.elementAttributeModified) {
                bindingEl.elementAttributeModified(index, el, attributeName, attributeValue, oldValue);
            }
        });
    }

    /**
     * Notifies binding elements of namespaced attribute changes.
     * @param {Element} el Changed element
     * @param {string} namespace Attribute namespace
     * @param {string} attributeName Attribute name
     * @param {string} attributeValue New value
     * @param {string} oldValue Previous value
     * @private
     */
    function _notifyAttributeNSModificationToBinding(el, namespace, attributeName, attributeValue, oldValue) {
        const binding = el.getAttribute('binding');
        if (!binding) return;
        
        const splittedBinding = binding.split(' ');
        splittedBinding.forEach((idAndIndex) => {
            const [bindingEl, index] = _getBindingAndIndex(idAndIndex, el);
            if (bindingEl && bindingEl.elementAttributeNSModified) {
                bindingEl.elementAttributeNSModified(index, el, namespace, attributeName, attributeValue, oldValue);
            }
        });
    }

    /**
     * Notifies binding elements of style property changes.
     * @param {Element} el Changed element
     * @param {string} propertyName CSS property name
     * @param {string} propertyValue New value
     * @param {string} oldValue Previous value
     * @private
     */
    function _notifyStyleModificationToBinding(el, propertyName, propertyValue, oldValue) {
        const binding = el.getAttribute('binding');
        if (!binding) return;
        
        const splittedBinding = binding.split(' ');
        splittedBinding.forEach((idAndIndex) => {
            const [bindingEl, index] = _getBindingAndIndex(idAndIndex, el);
            if (bindingEl && bindingEl.elementStyleModified) {
                bindingEl.elementStyleModified(index, el, propertyName, propertyValue, oldValue);
            }
        });
    }

    /**
     * Hooks DOM manipulation methods to intercept changes and notify bindings.
     * @private
     */
    function _setBindingHooks() {
        const originalSetAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name, value) {
            const oldValue = this.getAttribute(name);
            const result = originalSetAttribute.call(this, name, value);
            _notifyAttributeModificationToBinding(this, name, value, oldValue);
            return result;
        };

        const originalSetAttributeNS = Element.prototype.setAttributeNS;
        Element.prototype.setAttributeNS = function(namespace, name, value) {
            const oldValue = this.getAttributeNS(namespace, name);
            const result = originalSetAttributeNS.call(this, namespace, name, value);
            _notifyAttributeNSModificationToBinding(this, namespace, name, value, oldValue);
            return result;
        };

        const originalRemoveAttribute = Element.prototype.removeAttribute;
        Element.prototype.removeAttribute = function(name) {
            const oldValue = this.getAttribute(name);
            const result = originalRemoveAttribute.call(this, name);
            if (oldValue !== null) {
                _notifyAttributeModificationToBinding(this, name, null, oldValue);
            }
            return result;
        };

        const originalRemoveAttributeNS = Element.prototype.removeAttributeNS;
        Element.prototype.removeAttributeNS = function(namespace, name) {
            const oldValue = this.getAttributeNS(namespace, name);
            const result = originalRemoveAttributeNS.call(this, namespace, name);
            if (oldValue !== null) {
                _notifyAttributeNSModificationToBinding(this, namespace, name, null, oldValue);
            }
            return result;
        };

        // Style property proxy for direct assignments
        const proto = HTMLElement.prototype;
        const originalStyleDescriptor = Object.getOwnPropertyDescriptor(proto, "style");

        if (originalStyleDescriptor && originalStyleDescriptor.get) {
            Object.defineProperty(proto, "style", {
                get: function() {
                    const realStyle = originalStyleDescriptor.get.call(this);

                    if (!this._domiotProxiedStyle) {
                        realStyle._ownerElement = this;

                        // Override setProperty
                        const originalSetProperty = realStyle.setProperty;
                        realStyle.setProperty = function(propertyName, propertyValue, priority) {
                            const oldValue = this.getPropertyValue(propertyName);
                            const result = originalSetProperty.call(this, propertyName, propertyValue, priority);
                            _notifyStyleModificationToBinding(this._ownerElement, propertyName, propertyValue, oldValue);
                            return result;
                        };

                        // Override removeProperty
                        const originalRemoveProperty = realStyle.removeProperty;
                        realStyle.removeProperty = function(propertyName) {
                            const oldValue = this.getPropertyValue(propertyName);
                            const result = originalRemoveProperty.call(this, propertyName);
                            if (oldValue) {
                                _notifyStyleModificationToBinding(this._ownerElement, propertyName, "", oldValue);
                            }
                            return result;
                        };

                        // Create proxy to intercept property assignments
                        const proxied = new Proxy(realStyle, {
                            set: function(target, prop, value) {
                                // Skip function properties and internal properties
                                if (typeof prop === 'symbol' || 
                                    prop === 'length' || 
                                    prop === 'parentRule' ||
                                    prop.startsWith('_') ||
                                    prop === 'setProperty' ||
                                    prop === 'removeProperty' ||
                                    typeof target[prop] === 'function') {
                                    return Reflect.set(target, prop, value);
                                }

                                const oldValue = target[prop];
                                const result = Reflect.set(target, prop, value);
                                
                                if (typeof prop === 'string' && prop in target) {
                                    _notifyStyleModificationToBinding(target._ownerElement, prop, value, oldValue);
                                }
                                
                                return result;
                            },
                            get: function(target, prop, receiver) {
                                try {
                                    const val = Reflect.get(target, prop, receiver);
                                    return typeof val === "function" ? val.bind(target) : val;
                                } catch(e) {
                                    return null;
                                }
                            }
                        });

                        this._domiotProxiedStyle = proxied;
                    }

                    return this._domiotProxiedStyle;
                },
                configurable: originalStyleDescriptor.configurable,
                enumerable: originalStyleDescriptor.enumerable
            });
        }
    }

    /**
     * Processes binding elements and establishes element-to-binding relationships.
     * @private
     */
    function _setBindings() {
        let bindingEls = {};

        const elsWithBinding = document.querySelectorAll('[binding]');
        for (const el of elsWithBinding) {
            const binding = el.getAttribute('binding');
            if (!binding) continue;

            const splittedBinding = binding.split(' ');
            splittedBinding.forEach((idAndIndex) => {
                const [bindingEl, index] = _getBindingAndIndex(idAndIndex);
                if (!bindingEl) return;

                // Add binding element for later use
                if (bindingEl.id && !bindingEls[bindingEl.id]) {
                    bindingEls[bindingEl.id] = bindingEl;
                }

                // Handle element indexing within the binding
                if (bindingEl.elementsWithoutIndex) {
                    bindingEl.lastIndex = bindingEl.lastIndex + 1;
                    bindingEl.elementsWithoutIndex.set(bindingEl.lastIndex, el);
                    if (!el.bindings) el.bindings = {};
                    el.bindings[bindingEl.id] = bindingEl.lastIndex;
                    return;
                }


                // so far, elements have an index.
                if (index != null) {
                    if (!bindingEl.tmpElements) {
                        bindingEl.tmpElements = new Map();
                        bindingEl.elementsIndexes = [];
                    }
                    bindingEl.elementsIndexes.push(index);
                    bindingEl.tmpElements.set(index, el);
                    if (!el.bindings) el.bindings = {};
                    el.bindings[bindingEl.id] = index;
                } else {
                    // One index is non existant
                    // switch all to order-based indexing
                    bindingEl.elementsWithoutIndex = new Map(); 

                    // Reindex existing elements
                    bindingEl.lastIndex = -1;
                    if (bindingEl.tmpElements){
                        for (const [_index, _el] of bindingEl.tmpElements) {
                            bindingEl.lastIndex = bindingEl.lastIndex + 1;
                            bindingEl.elementsWithoutIndex.set(bindingEl.lastIndex, _el); 
                            if (!_el.bindings) _el.bindings = {};
                            _el.bindings[bindingEl.id] = bindingEl.lastIndex;
                        }
                        delete bindingEl.elementsIndexes;
                        delete bindingEl.tmpElements;
                    }

                    bindingEl.lastIndex = bindingEl.lastIndex + 1;
                    bindingEl.elementsWithoutIndex.set(bindingEl.lastIndex, el);
                    if (!el.bindings) el.bindings = {};
                    el.bindings[bindingEl.id] = bindingEl.lastIndex;
                }
            });
        }

        // order elements and dispatch load event on bindings.
        for (const id in bindingEls) {
            const bindingEl = bindingEls[id];

            // Order elements
            if (bindingEl.elementsWithoutIndex) {
                bindingEl.elements = bindingEl.elementsWithoutIndex;
                delete bindingEl.elementsWithoutIndex;
            } else {
                if (!bindingEl.elements) {
                    bindingEl.elements = new Map();
                }

                bindingEl.elementsIndexes.sort((a, b) => a - b);
                bindingEl.elementsIndexes.forEach(elementIndex => {
                    bindingEl.elements.set(elementIndex, bindingEl.tmpElements.get(elementIndex));
                });
                delete bindingEl.elementsIndexes;
                delete bindingEl.tmpElements;
            }

            bindingEl.bdcom = bdcom;
            bindingEl.dispatchEvent(new Event('load'));
        }
    }

    /**
     * Registers user-defined custom IoT elements.
     * @param {HTMLElementCollection[]} elementClassCollections Array of collections
     * @private
     */
    function _addIoTElements(elementClassCollections) {
        elementClassCollections.forEach(elementClassCollection => {
            for (const [tagName, elementClass] of elementClassCollection) {
                try {
                    customElements.define(tagName, elementClass);
                } catch(e) {
                    console.error(`Failed to define custom element '${tagName}':`, e);
                }
            }
        });
    }

    /**
     * Parses binding ID and index from a binding attribute value.
     * @param {string} idAndIndex String in format "bindingId" or "bindingId:index"
     * @param {Element} el Element
     * @returns {Array} [bindingElement, index] where index is null if not specified
     * @private
     */
    function _getBindingAndIndex(idAndIndex, el) {
        if (!idAndIndex) return [null, null];
        
        let id = null;
        let index = null;

        const match = idAndIndex.match(/^(.*):(\d+)$/);

        if (match) {
            id = match[1];
            if (el && el.bindings && typeof el.bindings[id] !== 'undefined') {
                index = el.bindings[id];
            } else {
                index = parseInt(match[2], 10);
            }
        } else {
            id = idAndIndex;
            if (el && el.bindings && typeof el.bindings[id] !== 'undefined') {
                index = el.bindings[id];
            } else {
                index = null;
            }
        }

        const bindingEl = document.getElementById(id);
        return [bindingEl, index];
    }

    /**
     * Processes style attribute and notifies bindings of all properties.
     * @param {Element} el Element with style attribute
     * @param {CSSStyleDeclaration} style Style object to process
     * @private
     */
    function _elementStyleAttributeSet(el, style) {
        for (let i = 0; i < style.length; i++) {
            const propertyName = style[i];
            const propertyValue = style.getPropertyValue(propertyName);
            _notifyStyleModificationToBinding(el, propertyName, propertyValue);
        }
    }
}