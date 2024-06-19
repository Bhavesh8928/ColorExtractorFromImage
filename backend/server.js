const express = require('express');
const multer = require('multer');
const cors = require('cors');
const Vibrant = require('node-vibrant');

const app = express();
const port = 5000;

app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Threshold for ignoring colors close to white
const ignoreThreshold = 30; // Adjust as needed

app.post('/api/extractColors', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const palette = await Vibrant.from(req.file.buffer).getPalette();

        const ignoredColors = new Set();
        const colorCount = {};

        for (const key in palette) {
            const swatch = palette[key];
            if (swatch && !isBackground(swatch.rgb[0], swatch.rgb[1], swatch.rgb[2], ignoreThreshold)) {
                const rgb = `rgb(${swatch.rgb[0]},${swatch.rgb[1]},${swatch.rgb[2]})`;
                colorCount[rgb] = swatch.population; // Using population as color count
            } else {
                ignoredColors.add(`rgb(${swatch.rgb[0]},${swatch.rgb[1]},${swatch.rgb[2]})`);
            }
        }

        const sortedColors = Object.entries(colorCount)
            .sort((a, b) => b[1] - a[1]) // Sort by population (count)
            .slice(0, 10) // Limit to top 10 colors
            .map(([rgb]) => rgbToHex(rgb)); // Convert RGB to HEX

        // Fill remaining slots with null
        while (sortedColors.length < 10) {
            sortedColors.push(null);
        }

        res.json({ colors: sortedColors });
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).send('Error processing image.');
    }
});

function isBackground(r, g, b, threshold) {
    // Check if color is close to white (adjust as needed)
    return r > 255 - threshold && g > 255 - threshold && b > 255 - threshold;
}

function rgbToHex(rgb) {
    // Convert RGB to HEX
    const [r, g, b] = rgb.match(/\d+/g);
    return `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`;
}

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
