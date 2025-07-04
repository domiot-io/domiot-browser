# Retail Store Podium with Touch Screen - Interactive Display

This example demonstrates the integration of touch screens with physical items in a beauty boutique, allowing customers to interact with different perfume brands through on a display unit.

![podium](https://raw.githubusercontent.com/domiot-io/documents/refs/heads/main/images/perfume-podium-touch-screen.jpg)

*Podium on display unit. Brand elements have been blurred for publication.*

## Overview

**Scenario**: A perfume display unit in a beauty boutique featuring a podium with four perfumes. Customers can pick up and put down bottles on podium tiles and watch or select content of the different perfume brands on a screen.

**Hardware**:
- Main podium with four perfume bottles over four tiles.
- Storage columns beneath each tile.
- Touch screen.

**Interaction Flows**:
- When a customer picks up a bottle, the corresponding tile and column stay lit while the others dim, and the perfume brand’s video is displayed.
- When a customer selects content on the touch screen, the corresponding tile and column remain illuminated while the rest dim.

![podium interacion](https://raw.githubusercontent.com/domiot-io/documents/refs/heads/main/images/retail-perfume-podium.gif)

*A version of a podium on a display unit. Video and brand elements have been blurred for publication.*

## Installation

### 1. Load Test Drivers

Verify that `/dev/iohubx24-sim0` and `/dev/ohubx24-sim0` exist:
```
ls /dev/iohubx24-sim0
ls /dev/ohubx24-sim0
```

If they don't load them:

```bash
# Input driver
cd drivers/linux/iohubx24-sim
make load

# Output driver
cd drivers/linux/ohubx24-sim  
make load NUM_DEVICES=2       # We need two, one for the tiles
                              # and another for the column of cubbies.
```

### 2. Test the Drivers

#### Input Driver

In this example this mock driver will simulate the input of a pick up / put down detector, such as a camera with a real-time object software.

```
Location: /dev/iohubx24-sim0
Channels: 4 channels used (of 24 available) : 4 perfume bottles (0-3)
Format: "0100" (putdown, pickup, putdown, putdown)
```
Monitor:
```
cat /dev/iohubx24-sim0
```
write to driver:
```
echo 0100 > /dev/iohubx24-sim0 # pick up the second perfume bottle from left
echo 0000 > /dev/iohubx24-sim0 # put the bottle down.
echo 0010 > /dev/iohubx24-sim0
```

#### Output Driver

In this example this mock driver simulates a relay.

```
Location: /dev/ohubx24-sim0  
Channels: 4 channels used (of 24 available): 1 per tile.
Colors: off:0, on:1
Format: "1010" (white, blue, white, blue)
```
Monitor:
```
echo 1010 > /dev/ohubx24-sim0 
echo 1100 > /dev/ohubx24-sim0 
watch -n 1 cat /tmp/dev/ohubx24-output0

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

    <iot-display-unit id="perfumeDisplayUnit">

        <iot-podium id="mainPodium">
            <iot-tile id="tile1" style="color:white;" binding="tileColorBinding">
                <iot-item id="perfume1" brand="Brand1" commercial-start-time="0" binding="itemBinding"></iot-item>
            </iot-tile>
            <!-- ... more tiles ... -->
        </iot-podium>

        <!-- Storage Columns beneath each Tile -->
        <iot-column id="column1" style="color:white;" binding="columnColorBinding">
            <iot-cubby id="cubby1-1"></iot-cubby>
            <iot-cubby id="cubby1-2"></iot-cubby>
            <iot-cubby id="cubby1-3"></iot-cubby>
        </iot-column>
        <!-- ... more columns ... -->

    </iot-display-unit>

</iot-section>
<body>
    <!-- ... -->
    <!-- Brand 1 Video -->
    <div class="video-container">
        <video class="perfume-video" muted>
            <source src="videos/perfume-brand1.mp4" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="perfume-label">Brand 1<br>Elegance</div>
    </div>
    <!-- ... more videos ... -->
</body>
```

### Initialize DOMIoT with retail elements and bindings
```
DOMIoT([retailElements, iotBindings], 'ws://localhost:8080');
```

### Event Handling

```javascript
const perfumes = document.querySelectorAll('#perfumeDisplayUnit iot-item');
const tiles = document.querySelectorAll('#perfumeDisplayUnit iot-tile');
const columns = document.querySelectorAll('#perfumeDisplayUnit iot-column');

// Handle pickup events
perfumes.forEach((perfume, index) => {
    perfume.addEventListener('pickup', (ev) => {
        const perfume = ev.target;
        const brand = perfume.getAttribute('brand');

        // Set as the last picked up item
        lastPickedUp = perfume;
        illuminateForPerfume(index);
        playVideo(index);
        startLightTimeout();
    });
    
    perfume.addEventListener('putdown', (ev) => {
        const perfume = ev.target;
        //...
    });
});
```

## Testing

### Monitor Hardware State

Watch tile inputs:
```
cat /dev/iohubx24-sim0
```

Watch tiles lights:
```
watch -n 1 cat /tmp/ohubx24-output0
```
Watch column of cubbies lights:
```
watch -n 1 cat /tmp/ohubx24-output0
```

Open the developers tools in your browser (F12), you should see the logs, `iohubx24-sim0` will simulate tile interactions.

## License

MIT. 