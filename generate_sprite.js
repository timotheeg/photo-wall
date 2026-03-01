const { Jimp } = require('jimp');

async function createPlaceholderSprite() {
    const width = 3000;
    const height = 400;
    const poseWidth = 300;

    // Create a new image
    const image = new Jimp({ width, height, color: 0xFFFFFFFF });

    const poses = [
        "Up", "Up-Right", "Right", "Down-Right",
        "Down", "Down-Left", "Left", "Up-Left",
        "Straight", "Funny"
    ];

    // Array of distinct colors for each pose to make it obvious
    const colors = [
        0xFF0000FF, // Red
        0xFF7F00FF, // Orange
        0xFFFF00FF, // Yellow
        0x7FFF00FF, // Chartreuse
        0x00FF00FF, // Green
        0x00FF7FFF, // Spring Green
        0x00FFFFFF, // Cyan
        0x007FFFFF, // Azure
        0x0000FFFF, // Blue (Straight)
        0xFF00FFFF  // Magenta (Funny)
    ];

    for (let i = 0; i < 10; i++) {
        const xOffset = i * poseWidth;

        // Fill background for the pose
        for (let x = xOffset; x < xOffset + poseWidth; x++) {
            for (let y = 0; y < height; y++) {
                // Draw a border
                if (x === xOffset || x === xOffset + poseWidth - 1 || y === 0 || y === height - 1) {
                    image.setPixelColor(0x000000FF, x, y);
                } else {
                    image.setPixelColor(colors[i], x, y);
                }
            }
        }

        // We can draw a simple marker for the "center" (eyes)
        // Let's say center is at (150, 150) relative to the pose
        const cx = xOffset + 150;
        const cy = 150;

        for (let dx = -5; dx <= 5; dx++) {
            for (let dy = -5; dy <= 5; dy++) {
                if (cx + dx >= 0 && cx + dx < width && cy + dy >= 0 && cy + dy < height) {
                    image.setPixelColor(0x000000FF, cx + dx, cy + dy);
                }
            }
        }
    }

    await image.write('public/sprite1.png');
    await image.write('public/sprite2.png'); // Make two people
    console.log("Sprites generated!");
}

createPlaceholderSprite().catch(console.error);
