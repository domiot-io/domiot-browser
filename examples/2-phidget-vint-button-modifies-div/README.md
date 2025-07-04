# Six Physical Buttons Connected to a Phidget VINT Modify Div

This example showcases the integration of physical touch buttons with a web application, allowing physical button presses and releases to modify web page elements.

The hardware specification of a Phidget VINT device can be found on the [Phidget website, What is VINT?](https://www.phidgets.com/docs/What_is_VINT%3F).

## Overview

**Scenario**: A web application where physical touch button presses and releases modify the appearance of corresponding div elements.

**Hardware**:
- 6 physical touch buttons connected to a VINT.
- 1 Phidget VINT with 6 ports connected through USB.

**Interaction Flow**:
1) User presses or releases a physical touch button, 2) The corresponding div element changes color to indicate interaction.

## Installation

### 1. Load Test Drivers

Build and load the VINT driver (linux):
```bash
# Input driver
cd drivers/linux/phidgetvintx60
make clean
make
make load
```

Verify that `/dev/phidgetvintx60` exists:
```
ls /dev/phidgetvintx60
```

### 2. Test the Drivers

#### Input Driver

For this example we are connecting touch buttons to a VINT ( [What is VINT?](https://www.phidgets.com/docs/What_is_VINT%3F) ).

```
Location: /dev/phidgetvintx60
Channels: 6 channels used (of 6 available) : 6 touch buttons (0-5)
Format: "010000" (released, pressed, released, released, released, released)
```
Monitor:
```
cat /dev/phidgetvintx60
```
If you press and release the buttons you should see the bits.

### 3. Start DOMIoT Server

```
cd path/to/domiot-browser  # Navigate to domiot-browser root
npm start
```

### 4. Open Example

Open `index.html` in a web browser and press and release the buttons.

## Code Structure

### Include libraries

```
<script src="../lib/bdcom.1.0.0.min.js"></script>
<script src="../lib/domiot.1.0.0.min.js"></script>
<script src="../lib/retail-elements.1.0.0.min.js"></script>
<script src="../lib/iot-bindings.1.0.1.min.js"></script>
```

### System Description

```html
<iot-section style="display: none;">

    <!-- Phidget VINT Button Binding -->
    <iot-ibits-button-binding id="buttonsBinding" location="/dev/phidgetvintx60" />

    <!-- Physical Hardware Representation (Hidden) -->
    <iot-room>
        <iot-button id="physicalButton0" div-id="display0" binding="buttonsBinding">Physical Button 0</iot-button>
        <!-- ... more buttons ... -->
    </iot-room>

</iot-section>

<body>

    <div id="display0" class="button-card">
        <div class="button-number">0</div>
    </div>
    <!-- ... more divs ... -->

</body>
```

### Initialize DOMIoT with bindings
```javascript
DOMIoT([iotBindings, retailElements], 'ws://localhost:8080');
```

### Event Handling

```javascript
// Change colors of divs when buttons are pressed and released.
buttons.forEach(button => {

    button.addEventListener('press', (ev) => {
        const divId = ev.target.getAttribute('div-id');
        const div = document.getElementById(divId);
        div.classList.add('bright');
    });

    button.addEventListener('release', (ev) => {
        const divId = ev.target.getAttribute('div-id');
        const div = document.getElementById(divId);
        div.classList.remove('bright');
    });
});
```

## License

MIT. 