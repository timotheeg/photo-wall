let people = [];

const FUNNY_RADIUS = 20;
const STRAIGHT_RADIUS = 60;

const basePoseSquaredDistanceThresholds = {
    funny: FUNNY_RADIUS * FUNNY_RADIUS,
    straight: STRAIGHT_RADIUS * STRAIGHT_RADIUS
};

let currentScale = 1;

const container = document.getElementById('photo-wall-container');

// Map angles to poses
// Poses array indices:
// 0: Up (-PI/2)
// 1: Up-Right (-PI/4)
// 2: Right (0)
// 3: Down-Right (PI/4)
// 4: Down (PI/2)
// 5: Down-Left (3PI/4)
// 6: Left (PI or -PI)
// 7: Up-Left (-3PI/4)
// 8: Straight
// 9: Funny

function getDirectionIndex(angle) {
    // Convert angle from [-PI, PI] to [0, 2PI) shifted by PI/8 to easily map to octants
    let normalized = angle + Math.PI / 8;
    if (normalized < 0) {
        normalized += 2 * Math.PI;
    }

    // Each octant is PI/4 (45 degrees)
    const octant = Math.floor(normalized / (Math.PI / 4)) % 8;

    const mapping = {
        0: 2, // Right
        1: 3, // Down-Right
        2: 4, // Down
        3: 5, // Down-Left
        4: 6, // Left
        5: 7, // Up-Left
        6: 0, // Up
        7: 1  // Up-Right
    };

    return mapping[octant];
}

async function fetchPeople() {
    try {
        const response = await fetch('/api/people');
        if (!response.ok) throw new Error('Failed to fetch people');
        people = await response.json();
        renderWall();
    } catch (err) {
        console.error("Error loading people:", err);
    }
}

function renderWall() {
    container.innerHTML = '';

    if (people.length === 0) {
        return;
    }

    // Calculate optimal grid packing
    // We want to pack N items into a W x H area.
    // Each item has a 3:4 aspect ratio.
    const containerRect = container.getBoundingClientRect();
    const W = containerRect.width;
    const H = containerRect.height;

    const N = people.length;

    let bestCols = 1;
    let bestRows = N;
    let maxScale = 0;

    // Test all possible column counts from 1 to N
    for (let cols = 1; cols <= N; cols++) {
        const rows = Math.ceil(N / cols);

        // Calculate max scale based on width limitation
        // Width of one item is 300 * scale, so cols * 300 * scale <= W
        const scaleW = W / (cols * 300);

        // Calculate max scale based on height limitation
        // Height of one item is 400 * scale, so rows * 400 * scale <= H
        const scaleH = H / (rows * 400);

        // The limiting factor is the smaller of the two scales
        const scale = Math.min(scaleW, scaleH);

        // We want to maximize the scale (make them as big as possible)
        // Cap scale at 1.0 so we don't blow them up too large if there's only 1 person
        const constrainedScale = Math.min(scale, 1.0);

        if (constrainedScale > maxScale) {
            maxScale = constrainedScale;
            bestCols = cols;
            bestRows = rows;
        }
    }

    currentScale = maxScale;

    // Render with the best configuration
    const finalItemWidth = 300 * currentScale;
    const finalItemHeight = 400 * currentScale;

    // Center the entire grid within the container
    const totalGridWidth = bestCols * finalItemWidth;
    const totalGridHeight = bestRows * finalItemHeight;
    const offsetX = (W - totalGridWidth) / 2;
    const offsetY = (H - totalGridHeight) / 2;

    people.forEach((person, index) => {
        const col = index % bestCols;
        const row = Math.floor(index / bestCols);

        const xPos = offsetX + (col * finalItemWidth);
        const yPos = offsetY + (row * finalItemHeight);

        const div = document.createElement('div');
        div.className = 'snapshot';
        div.style.backgroundImage = `url(${person.spriteUrl})`;
        div.id = `person-${person.id}`;

        // Set dynamic dimensions and position
        div.style.width = `${finalItemWidth}px`;
        div.style.height = `${finalItemHeight}px`;
        div.style.left = `${xPos}px`;
        div.style.top = `${yPos}px`;

        // Scale the spritesheet appropriately
        // Spritesheet is 10 poses wide. So width is 3000 * scale, height is 400 * scale.
        div.style.backgroundSize = `${3000 * currentScale}px ${400 * currentScale}px`;

        // Start straight (index 8)
        div.style.backgroundPosition = `-${8 * 300 * currentScale}px 0px`;

        // Store person data on the element, scaling the center point
        div.dataset.cx = person.centerPoint.x * currentScale;
        div.dataset.cy = person.centerPoint.y * currentScale;

        container.appendChild(div);
    });
}

function init() {
    fetchPeople();

    // Handle window resize dynamically to repack
    window.addEventListener('resize', () => {
        if (people.length > 0) {
            renderWall();
        }
    });

    // 2. Track mouse
    document.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const snapshots = document.querySelectorAll('.snapshot');

        // Scale the distance thresholds based on how small the faces are
        const scaledFunnyThreshold = basePoseSquaredDistanceThresholds.funny * currentScale * currentScale;
        const scaledStraightThreshold = basePoseSquaredDistanceThresholds.straight * currentScale * currentScale;

        snapshots.forEach(snapshot => {
            const rect = snapshot.getBoundingClientRect();

            // Screen coordinates of the specific center point inside the image
            const personCx = rect.left + parseFloat(snapshot.dataset.cx);
            const personCy = rect.top + parseFloat(snapshot.dataset.cy);

            // Distance calculating
            const dx = mouseX - personCx;
            const dy = mouseY - personCy;
            const distance_squared = dx * dx + dy * dy;

            let poseIndex = 8; // Default to straight

            if (distance_squared < scaledFunnyThreshold) {
                poseIndex = 9; // Funny pose
            } else if (distance_squared < scaledStraightThreshold) {
                poseIndex = 8; // Straight pose
            } else {
                // Calculate angle from [-PI, PI]
                const angle = Math.atan2(dy, dx);
                poseIndex = getDirectionIndex(angle);
            }

            // Update background position
            // Each pose is 300px * currentScale wide
            snapshot.style.backgroundPositionX = `-${poseIndex * 300 * currentScale}px`;
        });
    });
}

// Start once DOM is loaded
document.addEventListener('DOMContentLoaded', init);
