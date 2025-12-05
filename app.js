// Initialize the map
const map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    zoomControl: true
});

// Add dark tile layer (CartoDB Dark Matter)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Store markers and line
let myMarker = null;
let missingMarker = null;
let connectionLine = null;

// DOM Elements
const myLatInput = document.getElementById('my-lat');
const myLngInput = document.getElementById('my-lng');
const missingLatInput = document.getElementById('missing-lat');
const missingLngInput = document.getElementById('missing-lng');
const trackBtn = document.getElementById('track-btn');
const useMyLocationBtn = document.getElementById('use-my-location');
const distanceCard = document.getElementById('distance-card');
const distanceValue = document.getElementById('distance-value');

// Load saved coordinates from localStorage
function loadSavedCoordinates() {
    const saved = localStorage.getItem('phoneTrackerCoords');
    if (saved) {
        try {
            const coords = JSON.parse(saved);
            if (coords.myLat) myLatInput.value = coords.myLat;
            if (coords.myLng) myLngInput.value = coords.myLng;
            if (coords.missingLat) missingLatInput.value = coords.missingLat;
            if (coords.missingLng) missingLngInput.value = coords.missingLng;
        } catch (e) {
            console.log('Could not load saved coordinates');
        }
    }
}

// Save coordinates to localStorage
function saveCoordinates() {
    const coords = {
        myLat: myLatInput.value,
        myLng: myLngInput.value,
        missingLat: missingLatInput.value,
        missingLng: missingLngInput.value
    };
    localStorage.setItem('phoneTrackerCoords', JSON.stringify(coords));
}

// Load saved coordinates on page load
loadSavedCoordinates();

// Create custom marker icons
function createCustomIcon(type) {
    const iconHtml = `
        <div class="custom-marker">
            <div class="marker-pin ${type}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${type === 'you' 
                        ? '<circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>'
                        : '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/>'}
                </svg>
            </div>
        </div>
    `;
    
    return L.divIcon({
        html: iconHtml,
        className: 'custom-div-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });
}

// Create popup content
function createPopupContent(type, lat, lng) {
    const title = type === 'you' ? '📍 Your Location' : '📱 Missing Phone';
    return `
        <div class="popup-content">
            <div class="popup-title ${type}">${title}</div>
            <div class="popup-coords">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
        </div>
    `;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

// Format distance for display
function formatDistance(km) {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`;
    } else if (km < 10) {
        return `${km.toFixed(2)} km`;
    } else {
        return `${km.toFixed(1)} km`;
    }
}

// Update map with markers
function updateMap() {
    const myLat = parseFloat(myLatInput.value);
    const myLng = parseFloat(myLngInput.value);
    const missingLat = parseFloat(missingLatInput.value);
    const missingLng = parseFloat(missingLngInput.value);
    
    // Clear existing markers and line
    if (myMarker) map.removeLayer(myMarker);
    if (missingMarker) map.removeLayer(missingMarker);
    if (connectionLine) map.removeLayer(connectionLine);
    
    const bounds = [];
    
    // Add your location marker
    if (!isNaN(myLat) && !isNaN(myLng)) {
        myMarker = L.marker([myLat, myLng], { icon: createCustomIcon('you') })
            .addTo(map)
            .bindPopup(createPopupContent('you', myLat, myLng));
        bounds.push([myLat, myLng]);
    }
    
    // Add missing phone marker
    if (!isNaN(missingLat) && !isNaN(missingLng)) {
        missingMarker = L.marker([missingLat, missingLng], { icon: createCustomIcon('missing') })
            .addTo(map)
            .bindPopup(createPopupContent('missing', missingLat, missingLng));
        bounds.push([missingLat, missingLng]);
    }
    
    // If both locations are set, draw line and show distance
    if (bounds.length === 2) {
        // Draw dashed line between points
        connectionLine = L.polyline(bounds, {
            color: '#00d4ff',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10',
            className: 'connection-line'
        }).addTo(map);
        
        // Calculate and display distance
        const distance = calculateDistance(myLat, myLng, missingLat, missingLng);
        distanceValue.textContent = formatDistance(distance);
        distanceCard.style.display = 'block';
        
        // Add animation class
        distanceCard.classList.add('show');
        
        // Fit map to show both markers with padding
        map.fitBounds(bounds, { 
            padding: [80, 80],
            maxZoom: 16
        });
    } else if (bounds.length === 1) {
        // Center on single marker
        map.setView(bounds[0], 15);
        distanceCard.style.display = 'none';
    }
}

// Get user's current location
function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    useMyLocationBtn.disabled = true;
    useMyLocationBtn.innerHTML = `
        <svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <path d="M9 12l2 2 4-4"/>
        </svg>
        Getting location...
    `;
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            myLatInput.value = position.coords.latitude;
            myLngInput.value = position.coords.longitude;
            
            useMyLocationBtn.disabled = false;
            useMyLocationBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
                </svg>
                Use Current Location
            `;
            
            // Auto-update map if missing phone coords are set
            if (missingLatInput.value && missingLngInput.value) {
                updateMap();
            }
        },
        (error) => {
            let message = 'Unable to get your location. ';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message += 'Please allow location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    message += 'Request timed out.';
                    break;
            }
            alert(message);
            
            useMyLocationBtn.disabled = false;
            useMyLocationBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
                </svg>
                Use Current Location
            `;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Event Listeners
trackBtn.addEventListener('click', () => {
    saveCoordinates(); // Save before tracking
    updateMap();
});
useMyLocationBtn.addEventListener('click', getCurrentLocation);

// Auto-save when inputs change
[myLatInput, myLngInput, missingLatInput, missingLngInput].forEach(input => {
    input.addEventListener('change', saveCoordinates);
});

// Allow Enter key to trigger tracking
[myLatInput, myLngInput, missingLatInput, missingLngInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            updateMap();
        }
    });
});

// Add some visual feedback
trackBtn.addEventListener('mousedown', () => {
    trackBtn.style.transform = 'scale(0.98)';
});

trackBtn.addEventListener('mouseup', () => {
    trackBtn.style.transform = '';
});

// Initial message on map
const initialMessage = L.popup()
    .setLatLng([20, 0])
    .setContent(`
        <div class="popup-content">
            <div class="popup-title" style="color: #00d4ff;">Welcome to PhoneTracker</div>
            <p style="color: #9999aa; margin-top: 8px; font-size: 0.85rem;">
                Enter coordinates for both devices<br>and click "Track Devices" to begin.
            </p>
        </div>
    `)
    .openOn(map);

// Mobile toggle functionality
const mobileToggle = document.getElementById('mobile-toggle');
const controlPanel = document.querySelector('.control-panel');
let panelCollapsed = false;

mobileToggle.addEventListener('click', () => {
    panelCollapsed = !panelCollapsed;
    controlPanel.classList.toggle('collapsed', panelCollapsed);
    
    // Update button icon
    mobileToggle.innerHTML = panelCollapsed 
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M4 6h16M4 12h16M4 18h16"/>
           </svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M18 6L6 18M6 6l12 12"/>
           </svg>`;
    
    // Refresh map size after panel toggle
    setTimeout(() => map.invalidateSize(), 300);
});

// Start with panel visible on mobile, collapse after first track
trackBtn.addEventListener('click', () => {
    if (window.innerWidth <= 900 && !panelCollapsed) {
        // Collapse panel on mobile after tracking to show map
        setTimeout(() => {
            panelCollapsed = true;
            controlPanel.classList.add('collapsed');
            mobileToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M4 6h16M4 12h16M4 18h16"/>
               </svg>`;
            map.invalidateSize();
        }, 500);
    }
});

// Add CSS for spinning animation
const style = document.createElement('style');
style.textContent = `
    .spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .info-card.show {
        animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);

// Handle window resize
window.addEventListener('resize', () => {
    map.invalidateSize();
});

