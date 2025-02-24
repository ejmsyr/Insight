const map = L.map('map').setView([36.1699, -115.1398], 11); // Centered on Las Vegas
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let gridLayers = [];

// Define Las Vegas bounds (must match Python script)
const bounds = {
    minLat: 36.0000,
    maxLat: 36.3000,
    minLon: -115.4000,
    maxLon: -115.0000
};

// Load elevation grid data
async function loadElevationData() {
    try {
        const response = await fetch("elevation_data.json");
        const data = await response.json();
        return data.grid;
    } catch (error) {
        console.error("🚨 Error loading elevation data:", error);
        return null;
    }
}

// Function to map a value to a smooth gradient color (Blue → Green → Yellow → Red)
function interpolateColor(value, minValue, maxValue) {
    if (maxValue === minValue) return "rgb(0, 255, 255)"; // Default blue

    const ratio = (value - minValue) / (maxValue - minValue);

    let r, g, b;
    if (ratio < 0.25) {
        // Blue → Green
        r = 0;
        g = Math.round(255 * (ratio / 0.25));
        b = 255;
    } else if (ratio < 0.50) {
        // Green → Yellow
        r = Math.round(255 * ((ratio - 0.25) / 0.25));
        g = 255;
        b = Math.round(255 * (1 - ((ratio - 0.25) / 0.25)));
    } else if (ratio < 0.75) {
        // Yellow → Orange
        r = 255;
        g = Math.round(255 * (1 - ((ratio - 0.50) / 0.25)));
        b = 0;
    } else {
        // Orange → Red
        r = 255;
        g = Math.round(165 * (1 - ((ratio - 0.75) / 0.25)));
        b = 0;
    }

    return `rgb(${r}, ${g}, ${b})`;
}

// Generate a smooth blended grid by shading adjacent rectangles
async function generateGrid() {
    gridLayers.forEach(layer => map.removeLayer(layer)); // Clear existing grid
    gridLayers = [];

    const elevationGrid = await loadElevationData();
    if (!elevationGrid) return;

    const numRows = elevationGrid.length;
    const numCols = elevationGrid[0].length;

    console.log(`🔄 Grid Size: ${numRows} x ${numCols}`); // Debugging Grid Size

    const latStep = (bounds.maxLat - bounds.minLat) / numRows;
    const lonStep = (bounds.maxLon - bounds.minLon) / numCols;

    // Find min and max elevation change values for scaling colors
    let minSlope = Infinity, maxSlope = -Infinity;
    elevationGrid.flat().forEach(value => {
        if (value < minSlope) minSlope = value;
        if (value > maxSlope) maxSlope = value-100;
    });

    console.log(`📊 Min Slope: ${minSlope}, Max Slope: ${maxSlope}`); // Debugging info

    for (let i = 0; i < numRows - 1; i++) {
        for (let j = 0; j < numCols - 1; j++) {
            let slopeA = elevationGrid[i][j];       // Current cell
            let slopeB = elevationGrid[i][j + 1];   // Right neighbor
            let slopeC = elevationGrid[i + 1][j];   // Bottom neighbor
            let slopeD = elevationGrid[i + 1][j + 1]; // Bottom-right neighbor

            // Average colors for smooth blending
            let avgSlope = (slopeA + slopeB + slopeC + slopeD) / 4;
            let colorA = interpolateColor(slopeA, minSlope, maxSlope);
            let colorB = interpolateColor(slopeB, minSlope, maxSlope);
            let colorC = interpolateColor(slopeC, minSlope, maxSlope);
            let colorD = interpolateColor(slopeD, minSlope, maxSlope);
            let avgColor = interpolateColor(avgSlope, minSlope, maxSlope);

            let rectBounds = [
                [bounds.minLat + i * latStep, bounds.minLon + j * lonStep],
                [bounds.minLat + (i + 1) * latStep, bounds.minLon + (j + 1) * lonStep]
            ];

            // Create a rectangle with a gradient effect by interpolating neighboring values
            let rect = L.rectangle(rectBounds, {
                color: avgColor,
                fillOpacity: 0.3,
                weight: 0
            }).addTo(map);

            gridLayers.push(rect);
        }
    }
}

// Load and display the elevation map on page load
document.addEventListener("DOMContentLoaded", generateGrid);
