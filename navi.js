let userLat, userLon, userElevation;
const map = L.map("map").setView([36.1699, -115.1398], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let routeLayer, bestMarker;
const METERS_TO_FEET = 3.28084;
const EARTH_RADIUS_MILES = 3958.8;

// Get User Location and Elevation
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                userLat = position.coords.latitude;
                userLon = position.coords.longitude;

                L.marker([userLat, userLon]).addTo(map);
                map.setView([userLat, userLon], 14);

                userElevation = await getElevation(userLat, userLon);
                userElevation *= METERS_TO_FEET;
            },
            (error) => {
                console.error("🚨 Error getting location:", error.message);
            }
        );
    } else {
        console.error("❌ Geolocation is not supported by this browser.");
    }
}

// Fetch Elevation Data using Open-Meteo API (No CORS Issues)
async function getElevation(lat, lon) {
    const apiUrl = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        return data.elevation;
    } catch (error) {
        console.error("🚨 Error fetching elevation:", error);
        return null;
    }
}

// Generate 30 Random Destinations
function generateDestinations(distanceMiles) {
    const destinations = [];

    for (let i = 0; i < 30; i++) {
        const randAngle = Math.random() * 2 * Math.PI;
        const randDistance = distanceMiles * (0.8 + Math.random() * 0.4);

        const deltaLat = (randDistance / EARTH_RADIUS_MILES) * (180 / Math.PI);
        const deltaLon = (randDistance / (EARTH_RADIUS_MILES * Math.cos(userLat * Math.PI / 180))) * (180 / Math.PI);

        destinations.push([userLat + deltaLat, userLon + deltaLon, randDistance]); // Store actual distance
    }
    return destinations;
}

// Clear Previous Route & Marker
function clearPreviousRoute() {
    if (routeLayer) {
        map.removeControl(routeLayer);
        routeLayer = null;
    }
    if (bestMarker) {
        map.removeLayer(bestMarker);
        bestMarker = null;
    }
}

// Find Best Route
async function findBestRoute() {
    const timeInput = document.getElementById("timeInput").value;
    if (!timeInput || timeInput <= 0) return alert("Please enter a valid time.");
    const travelDistance = timeInput * 0.1;

    clearPreviousRoute();
    document.getElementById("infoBox").style.display = "none";

    const destinations = generateDestinations(travelDistance);
    const elevations = await Promise.all(destinations.map(dest => getElevation(dest[0], dest[1])));
    
    let bestDecline = -Infinity, bestDestination = null, bestElevationChange = 0;

    for (let i = 0; i < destinations.length; i++) {
        const destElevation = elevations[i] * METERS_TO_FEET;
        const elevationChange = userElevation - destElevation;
        const declinePerMile = elevationChange / destinations[i][2]; // Use actual distance

        if (declinePerMile > bestDecline) {
            bestDecline = declinePerMile;
            bestDestination = destinations[i];
            bestElevationChange = elevationChange;
        }
    }

    if (bestDestination) {
        bestMarker = L.marker([bestDestination[0], bestDestination[1]]).addTo(map);

        // routeLayer = L.Routing.control({
        //     waypoints: [
        //         L.latLng(userLat, userLon),
        //         L.latLng(bestDestination[0], bestDestination[1])
        //     ],
        //     routeWhileDragging: false,
        //     createMarker: () => null,
        //     show: false // Disable the default info box
        // }).addTo(map);

        document.getElementById("distance").innerText = Math.round(2.1 * bestDestination[2].toFixed(2), 3); // Show correct distance
        document.getElementById("decline").innerText = bestElevationChange.toFixed(2);
        document.getElementById("declinePerMile").innerText = Math.round(bestDecline.toFixed(2) / 1.9);
        document.getElementById("googleMapsLink").href = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${bestDestination[0]},${bestDestination[1]}&travelmode=bicycling`;
        document.getElementById("infoBox").style.display = "block";
    }
}

const findDestinations = findBestRoute;
getUserLocation();
