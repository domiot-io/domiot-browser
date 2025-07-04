# Buttons Shelving Units - Basic IoT Interaction

This example demonstrates fundamental DOMIoT Browser concepts through a retail store aisle interface where physical button presses trigger video overlays and light color changes on shelving units.

![aisle](https://raw.githubusercontent.com/domiot-io/documents/refs/heads/main/images/aisle.jpg)

## Overview

**Scenario**: A supermarket aisle where customers can press physical buttons to see promotional videos and activate shelf lighting.

**Hardware**:
- 6 physical buttons (mapped to shelving units).
- Relay to switch white and blue lights on/off.
- Video projector.

**Interaction Flow**:
1) Customer presses physical button of a type of product, 2) Shelving unit containing this type of products illuminates in blue and a promotional video is projected on the floor.

## Installation

### 1. Load Test Drivers

Verify that `/dev/ihubx24-sim0` and `/dev/ohubx24-sim0  ` exist:
```
ls /dev/ihubx24-sim0
ls /dev/ohubx24-sim0
```

If they don't load them:

```bash
# Input driver
cd drivers/linux/ihubx24-sim
make load

# Output driver
cd drivers/linux/ohubx24-sim  
make load
```

### 2. Test the Drivers

#### Input Driver
```
Location: /dev/ihubx24-sim0
Channels: 6 channels used (of 24 available) : 6 buttons (0-5)
Format: "011101000000000000000000" (released, pressed, pressed, pressed, released, pressed)
```
Monitor:
```
cat /dev/ihubx24-sim0
```

If you use this driver to simulate button press/release, multiple buttons can be pressed and released each 10 seconds.

#### Output Driver
```
Location: /dev/ohubx24-sim0  
Channels: 12 channels used (of 24 available): 2 per shelving unit.
Colors: off:0, on:1
Format: "100101011001000000000000" (white, blue, blue, blue, white, blue)
```
Monitor:
```
watch -n 1 cat /tmp/dev/ohubx24-output0
echo 100101011001000000000000 > /dev/ohubx24-sim0 
echo 100110101010000000000000 > /dev/ohubx24-sim0 
```

### 3. Start DOMIoT Server

```
cd path/to/domiot-browser  # Navigate to domiot-browser root
npm start
```

### 4. Open Example

Open `index.html` in a web browser. Open the developer tools to see the logs (F12).

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
<iot-section style="display:none;">
    <iot-aisle id="aisle6" name="Coffee, Hot Beverages, Cookies & Chocolate">

        <!-- Hardware Bindings -->
        <iot-ibits-button-binding id="a6ButtonBinding" location="/dev/ihubx24-sim0">
        <iot-obits-color-binding id="a6ColorBinding" channels-per-element="2" colors-channel="white;blue" location="/dev/ohubx24-sim0">

        <!-- Physical Buttons -->
        <iot-button id="a6Product1Button" shelving-unit-id="a6L1" binding="a6ButtonBinding">
        <iot-button id="a6Product2Button" shelving-unit-id="a6L2" binding="a6ButtonBinding">
        <!-- ... more buttons ... -->

        <!-- Shelving Units with LED Control -->
        <iot-shelving-unit id="a6L1" name="Ground Coffee" video-src="videos/coffee-beans-by-Mixkit.mp4" style="color:white;" binding="a6ColorBinding">
        <iot-shelving-unit id="a6L2" name="Coffee Pods & K-Cups" video-src="videos/coffee-machine-by-Coverr.mp4" style="color:white;" binding="a6ColorBinding">
        <!-- ... more shelving units ... -->

    </iot-aisle>
</iot-section>
<body>
    
    <!-- ... -->

    <video id="fullscreenVideo" autoplay muted loop>
        <source src="" type="video/mp4">
        Your browser does not support the video tag.
    </video>
    
    <!-- ... -->

</body>
```

### Initialize DOMIoT with retail elements and bindings
```javascript
DOMIoT([retailElements, iotBindings], 'ws://localhost:8080');
```

### Event Handling

```javascript
// Handle button press events
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('iot-button');
    
    buttons.forEach(button => {
        button.addEventListener('press', (ev) => {

            // Get associated shelving unit
            const shelvingUnitId = ev.target.getAttribute('shelving-unit-id');
            if (!shelvingUnitId) return;
            const shelvingUnit = document.getElementById(shelvingUnitId);
            
            if (shelvingUnit) {
                
                // Light up shelving unit in blue color to blue
                shelvingUnit.style.setProperty('color', 'blue');

                // project video
                const videoSrc = shelvingUnit.getAttribute('video-src');
                fullscreenVideo.currentTime = 0;
                fullscreenVideo.src = videoSrc;
            }
        });

        button.addEventListener('release', (ev) => {
            // ...
        });
    });
});
```

## Testing

### Monitor Hardware State

Watch button inputs:
```
cat /dev/ihubx24-sim0
```

Watch LED outputs:
```
watch -n 1 cat /tmp/ohubx24-output0
```

Open the developers tools in your browser (F12), you should see the logs, `ihubx24-sim0` will simulate button presses and releases.

## License

MIT. 