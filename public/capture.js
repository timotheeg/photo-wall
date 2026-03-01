const video = document.getElementById('webcam');
const guideOverlay = document.getElementById('guide-overlay');
const ctxGuide = guideOverlay.getContext('2d');
const btnSnap = document.getElementById('snap-btn');
const instructionText = document.getElementById('instruction-text');
const progressFill = document.getElementById('progress-fill');
const spritesheetCanvas = document.getElementById('spritesheet-canvas');
const ctxSprite = spritesheetCanvas.getContext('2d');
const resultContainer = document.getElementById('result-container');
const btnSave = document.getElementById('save-btn');
const inputFilename = document.getElementById('filename-input');
const saveStatus = document.getElementById('save-status');

const centerSelectCanvas = document.getElementById('center-select-canvas');
const ctxCenter = centerSelectCanvas.getContext('2d');

let selectedCenterPoint = null;

// The sequence of poses to capture.
// Index maps to the position in the 3000x400 spritesheet (0-9)
const captureSequence = [
    { name: "Straight", index: 8 },
    { name: "Up", index: 0 },
    { name: "Up Right", index: 1 },
    { name: "Right", index: 2 },
    { name: "Down Right", index: 3 },
    { name: "Down", index: 4 },
    { name: "Down Left", index: 5 },
    { name: "Left", index: 6 },
    { name: "Up Left", index: 7 },
    { name: "Funny", index: 9 }
];

let currentPoseStep = 0;
let stream = null;
let isCapturing = false;

// Initialize the webcam and guide
async function init() {
    drawGuide();

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 300 },
                height: { ideal: 400 },
                facingMode: "user"
            }
        });
        video.srcObject = stream;

        // Wait for video to be ready before starting wizard
        video.onloadedmetadata = () => {
            btnSnap.disabled = false;
            startNextPose();

            // Allow spacebar to snap
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && !btnSnap.disabled && currentPoseStep < captureSequence.length) {
                    e.preventDefault(); // Prevent scrolling
                    captureCurrentPose();
                }
            });

            btnSnap.addEventListener('click', captureCurrentPose);
        };
    } catch (err) {
        console.error("Error accessing webcam: ", err);
        instructionText.textContent = "Error Accessing Webcam. Please check permissions.";
        instructionText.style.color = "#ef4444";
    }

    btnSave.addEventListener('click', saveSpritesheet);
}

// Draw the circle guide
function drawGuide() {
    ctxGuide.clearRect(0, 0, guideOverlay.width, guideOverlay.height);

    // Draw semi-transparent dark overlay for the outside
    ctxGuide.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctxGuide.fillRect(0, 0, guideOverlay.width, guideOverlay.height);

    // Cut out the circle
    ctxGuide.globalCompositeOperation = 'destination-out';
    ctxGuide.beginPath();
    // Centered horizontally (150), top third (y=150), radius=80
    ctxGuide.arc(150, 150, 80, 0, Math.PI * 2);
    ctxGuide.fill();

    // Draw stroke
    ctxGuide.globalCompositeOperation = 'source-over';
    ctxGuide.beginPath();
    ctxGuide.arc(150, 150, 80, 0, Math.PI * 2);
    ctxGuide.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctxGuide.lineWidth = 2;
    ctxGuide.stroke();

    // Minor crosshair in the center of the circle to help alignment
    ctxGuide.beginPath();
    ctxGuide.moveTo(145, 150);
    ctxGuide.lineTo(155, 150);
    ctxGuide.moveTo(150, 145);
    ctxGuide.lineTo(150, 155);
    ctxGuide.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctxGuide.lineWidth = 1;
    ctxGuide.stroke();
}

function startNextPose() {
    if (currentPoseStep >= captureSequence.length) {
        finishCapture();
        return;
    }

    const pose = captureSequence[currentPoseStep];
    instructionText.textContent = `Please look ${pose.name}`;

    // Update progress bar
    const progress = (currentPoseStep / captureSequence.length) * 100;
    progressFill.style.width = `${progress}%`;

    speakInstruction(`Please look ${pose.name}`);
}

function speakInstruction(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9; // Slightly slower for clarity
        window.speechSynthesis.speak(utterance);
    }
}

function captureCurrentPose() {
    if (currentPoseStep >= captureSequence.length) return;

    // Visual feedback "flash"
    guideOverlay.style.backgroundColor = 'rgba(255,255,255,0.5)';
    setTimeout(() => {
        guideOverlay.style.backgroundColor = 'transparent';
    }, 100);

    const pose = captureSequence[currentPoseStep];
    const targetX = pose.index * 300;

    // Because the video is mirrored via CSS scaleX(-1), the actual pixel data in the <video> 
    // is not mirrored. To save it exactly as the user sees it (mirrored), we must flip the canvas context before drawing.
    ctxSprite.save();

    // Move to the position where we want to draw, and set up mirroring
    // We want to mirror *within* the 300px block.
    // So we translate to targetX + 300, scaleX(-1), and draw at x=0

    ctxSprite.translate(targetX + 300, 0);
    ctxSprite.scale(-1, 1);

    // Draw the current video frame into this 300x400 slot
    // The video might not be exactly 300x400 natively depending on the camera aspect ratio,
    // so we handle cropping to fit object-fit: cover behavior.

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    const vRatio = vWidth / vHeight;
    const targetRatio = 300 / 400;

    let sx, sy, sWidth, sHeight;

    if (vRatio > targetRatio) {
        // Video is wider than target. Crop sides.
        sHeight = vHeight;
        sWidth = sHeight * targetRatio;
        sx = (vWidth - sWidth) / 2;
        sy = 0;
    } else {
        // Video is taller than target. Crop top/bottom.
        sWidth = vWidth;
        sHeight = sWidth / targetRatio;
        sx = 0;
        sy = (vHeight - sHeight) / 2;
    }

    ctxSprite.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, 300, 400);

    ctxSprite.restore();

    // Move to next step
    currentPoseStep++;
    startNextPose();
}

function finishCapture() {
    instructionText.textContent = "All poses captured!";
    progressFill.style.width = "100%";
    btnSnap.disabled = true;
    speakInstruction("All poses captured. Please select the center point between your eyes on the straight photo.");

    // Extract the straight photo (index 8) to the selection canvas
    const startX = 8 * 300;

    // Draw the straight pose onto the selection canvas
    ctxCenter.drawImage(spritesheetCanvas, startX, 0, 300, 400, 0, 0, 300, 400);

    // Add click listener for selection
    centerSelectCanvas.addEventListener('click', handleCenterSelect);

    // Show the result container
    resultContainer.style.display = 'flex';

    // Scroll to it
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

function handleCenterSelect(e) {
    const rect = centerSelectCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    selectedCenterPoint = { x: Math.round(x), y: Math.round(y) };

    // Redraw the straight pose to clear previous markers
    const startX = 8 * 300;
    ctxCenter.drawImage(spritesheetCanvas, startX, 0, 300, 400, 0, 0, 300, 400);

    // Draw a prominent crosshair at the selected point
    ctxCenter.beginPath();
    ctxCenter.arc(selectedCenterPoint.x, selectedCenterPoint.y, 4, 0, Math.PI * 2);
    ctxCenter.fillStyle = '#ef4444'; // Red center
    ctxCenter.fill();
    ctxCenter.strokeStyle = 'white';
    ctxCenter.lineWidth = 2;
    ctxCenter.stroke();

    ctxCenter.beginPath();
    ctxCenter.moveTo(selectedCenterPoint.x - 10, selectedCenterPoint.y);
    ctxCenter.lineTo(selectedCenterPoint.x + 10, selectedCenterPoint.y);
    ctxCenter.moveTo(selectedCenterPoint.x, selectedCenterPoint.y - 10);
    ctxCenter.lineTo(selectedCenterPoint.x, selectedCenterPoint.y + 10);
    ctxCenter.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctxCenter.lineWidth = 2;
    ctxCenter.stroke();

    // Enable save button now that we have a point
    btnSave.disabled = false;
    saveStatus.textContent = "Point selected. You can now save.";
    saveStatus.className = 'status-success';
}

async function saveSpritesheet() {
    let filename = inputFilename.value.trim();
    if (!filename) {
        filename = `sprite_${Date.now()}`;
        inputFilename.value = filename;
    }

    // Ensure no .png in name to prevent double extension
    filename = filename.replace(/\.png$/i, '');

    btnSave.disabled = true;
    btnSave.textContent = "Saving...";
    saveStatus.textContent = "";

    try {
        const dataURL = spritesheetCanvas.toDataURL('image/png');

        const response = await fetch('/api/save-sprite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: filename,
                image: dataURL,
                centerPoint: selectedCenterPoint
            })
        });

        const result = await response.json();

        if (response.ok) {
            saveStatus.textContent = `Success! Saved as ${result.path}`;
            saveStatus.className = 'status-success';
        } else {
            throw new Error(result.error || "Unknown error occurred");
        }
    } catch (err) {
        console.error("Save error:", err);
        saveStatus.textContent = `Error: ${err.message}`;
        saveStatus.className = 'status-error';
    } finally {
        btnSave.disabled = false;
        btnSave.textContent = "Save to Server";
    }
}

// Start sequence when page loads
document.addEventListener('DOMContentLoaded', init);
