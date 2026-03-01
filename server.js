const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Need body-parser for large base64 strings
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const PEOPLE_FILE = path.join(__dirname, 'people.json');

// Initialize people.json if it doesn't exist
if (!fs.existsSync(PEOPLE_FILE)) {
    fs.writeFileSync(PEOPLE_FILE, JSON.stringify([]), 'utf8');
}

// Endpoint to fetch the people list
app.get('/api/people', (req, res) => {
    fs.readFile(PEOPLE_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading people.json:', err);
            return res.status(500).json({ error: 'Failed to read people data' });
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    });
});

// Endpoint to save the generated spritesheet
app.post('/api/save-sprite', (req, res) => {
    const { filename, image, centerPoint } = req.body;

    if (!filename || !image) {
        return res.status(400).json({ error: 'Filename and image data are required.' });
    }

    // Remove the data URI header (e.g., "data:image/png;base64,")
    const base64Data = image.replace(/^data:image\/png;base64,/, "");

    const filePath = path.join(__dirname, 'public', `${filename}.png`);

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('Error saving image:', err);
            return res.status(500).json({ error: 'Failed to save image' });
        }
        console.log(`Saved new sprite to ${filePath}`);

        // Update people.json
        fs.readFile(PEOPLE_FILE, 'utf8', (readErr, data) => {
            if (readErr) {
                console.error('Error reading people.json:', readErr);
                return res.status(500).json({ error: 'Failed to update people data' });
            }

            let people = [];
            try {
                people = JSON.parse(data);
            } catch (parseErr) {
                console.error('Error parsing people.json:', parseErr);
                people = [];
            }

            const spriteUrl = `${filename}.png`;
            const existingPersonIndex = people.findIndex(p => p.spriteUrl === spriteUrl);

            const newPersonData = {
                id: filename,
                spriteUrl: spriteUrl,
                centerPoint: centerPoint || { x: 150, y: 150 } // Default if missing
            };

            if (existingPersonIndex !== -1) {
                people[existingPersonIndex] = newPersonData;
            } else {
                people.push(newPersonData);
            }

            fs.writeFile(PEOPLE_FILE, JSON.stringify(people, null, 4), 'utf8', (writeErr) => {
                if (writeErr) {
                    console.error('Error writing to people.json:', writeErr);
                    return res.status(500).json({ error: 'Failed to save people data' });
                }

                res.json({ success: true, path: spriteUrl });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
