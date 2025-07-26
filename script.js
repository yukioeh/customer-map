let map;
let markers = []; // Array to hold all Google Maps markers
let allCustomersData = []; // Store all customer data from GeoJSON
let uniqueIndustries = new Set(); // To populate the industry filter

// Function to initialize the map (called by Google Maps API script)
window.initMap = function() {
    console.log("initMap called: Initializing Google Map..."); // Log 1
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 39.8283, lng: -98.5795 }, // Centered on approximate geographical center of contiguous US for better visibility
        zoom: 6, // A higher zoom level to see regional details
        mapTypeControl: false, // Optional: remove map type control
        streetViewControl: false, // Optional: remove street view control
        disableDefaultUI: true, // Disable all default controls for debugging
        mapId: "84676165da099260abce5f76" // YOUR ACTUAL MAP ID IS ADDED HERE!
    });
    console.log("Map initialized. Attempting to fetch GeoJSON..."); // Log 2

    // Load customer data from GeoJSON
    fetch("customers.geojson")
        .then(response => {
            if (!response.ok) {
                // Check if the network request itself was successful
                throw new Error(`HTTP error! status: ${response.status} - Could not load customers.geojson`);
            }
            return response.json();
        })
        .then(data => {
            console.log("GeoJSON data fetched successfully:", data); // Log 3: IMPORTANT! Check this output
            allCustomersData = data.features;
            console.log("Number of customer features loaded:", allCustomersData.length); // Log 4: Check if features array is populated
            populateIndustryFilter(); // Populate filter *before* displaying markers
            displayCustomersOnMap(); // Initial display of all customers
            console.log("Customers displayed on map (attempted)."); // Log 5
        })
        .catch(error => console.error("Error loading or processing GeoJSON:", error)); // Log 6 (for any fetch/json errors)

    // Add event listeners for filters
    document.getElementById('industry-filter').addEventListener('change', applyFilters);
    document.getElementById('marcap-filter').addEventListener('change', applyFilters);
}; // Note the semicolon here, as it's a function expression

// Ensure initMap is called when the DOM is fully loaded and Google Maps API is ready
// This pattern explicitly waits for the DOM and API to be ready.
document.addEventListener("DOMContentLoaded", () => {
    // If the Google Maps API has already loaded, call initMap directly.
    // Otherwise, it will be called by the API's own loading mechanism when it's ready.
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
        window.initMap();
    }
});


// Function to populate the industry filter dropdown
function populateIndustryFilter() {
    allCustomersData.forEach(customer => {
        if (customer.properties.industry) {
            uniqueIndustries.add(customer.properties.industry);
        }
    });

    const industryFilter = document.getElementById('industry-filter');
    // Sort industries alphabetically
    Array.from(uniqueIndustries).sort().forEach(industry => {
        const option = document.createElement('option');
        option.value = industry;
        option.textContent = industry;
        industryFilter.appendChild(option);
    });
}

// Function to get marker color based on industry
function getIndustryColor(industry) {
    // Custom palette using ServiceNow accent colors for distinction
    const colors = {
        "Technology": "#0070D2",        // ServiceNow $color-blue
        "Finance": "#8A2BE2",           // ServiceNow $color-purple
        "Healthcare": "#65BC3C",        // ServiceNow $color-green
        "Retail": "#FFC024",            // ServiceNow $color-yellow
        "Manufacturing": "#FF8C00",     // ServiceNow $color-orange
        "Energy": "#D92027",            // ServiceNow $color-red
        "Automotive": "#00B5AD",        // ServiceNow $color-cyan
        "Consumer Goods": "#FF69B4",    // ServiceNow $color-pink
        "Diversified Financials": "#8A2BE2", // Reuse purple
        "Software": "#0070D2",          // Reuse blue
        "Telecommunications": "#00B5AD", // Reuse cyan
        "Pharmaceuticals": "#65BC3C",   // Reuse green
        "Semiconductors": "#0070D2",    // Reuse blue
        "Banking": "#8A2BE2",           // Reuse purple
        "Industrial Conglomerates": "#FFC024", // Reuse yellow
        "Aerospace & Defense": "#65BC3C", // Reuse green
        "Utilities": "#00B5AD",         // Reuse cyan
        // Default color for industries not explicitly listed
    };
    return colors[industry] || "#888888"; // A neutral grey if industry not in palette
}

// Function to get marker size (scaled content) based on Marcap
function getMarcapSize(marcap) {
    if (marcap < 1000000000) return 20;
    if (marcap >= 1000000000 && marcap < 10000000000) return 28;
    return 36;
}

// Function to clear all existing markers from the map
function clearMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].map = null;
    }
    markers = [];
}

// Function to display customers based on current filters
async function displayCustomersOnMap() {
    clearMarkers();

    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    const selectedIndustry = document.getElementById('industry-filter').value;
    const selectedMarcapTier = document.getElementById('marcap-filter').value;

    allCustomersData.forEach(customer => {
        const properties = customer.properties;
        const coordinates = customer.geometry.coordinates;

        let showCustomer = true;

        if (selectedIndustry !== 'all' && properties.industry !== selectedIndustry) {
            showCustomer = false;
        }

        if (showCustomer && selectedMarcapTier !== 'all') {
            const marcap = properties.marcap;
            if (selectedMarcapTier === 'small' && marcap >= 1000000000) {
                showCustomer = false;
            } else if (selectedMarcapTier === 'medium' && (marcap < 1000000000 || marcap >= 10000000000)) {
                showCustomer = false;
            } else if (selectedMarcapTier === 'large' && marcap < 10000000000) {
                showCustomer = false;
            }
        }

        if (showCustomer && coordinates && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number' && !isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
            const latLng = { lat: coordinates[1], lng: coordinates[0] };

            const markerContent = document.createElement('div');
            markerContent.style.backgroundColor = getIndustryColor(properties.industry);
            markerContent.style.borderRadius = '50%';
            markerContent.style.width = `${getMarcapSize(properties.marcap)}px`;
            markerContent.style.height = `${getMarcapSize(properties.marcap)}px`;
            markerContent.style.border = `2px solid #FFFFFF`;
            markerContent.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';
            markerContent.style.display = 'flex';
            markerContent.style.alignItems = 'center';
            markerContent.style.justifyContent = 'center';
            markerContent.style.color = '#FFFFFF';
            markerContent.style.fontSize = `${Math.round(getMarcapSize(properties.marcap) / 3.5)}px`;
            markerContent.style.fontWeight = 'bold';
            markerContent.textContent = properties.name.charAt(0);

            const marker = new AdvancedMarkerElement({
                position: latLng,
                map: map,
                title: properties.name,
                content: markerContent,
            });

            console.log(`Created marker for ${properties.name} at Lat: ${coordinates[1]}, Lng: ${coordinates[0]}`);

            const infoWindowContent = `
                <div class="info-window" style="color: #333; font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;">
                    <h3 style="margin-top: 0; color: #1A1A1A;">${properties.name}</h3>
                    <p style="margin-bottom: 5px;"><strong>Address:</strong> ${properties.address || 'N/A'}</p>
                    <p style="margin-bottom: 5px;"><strong>Industry:</strong> ${properties.industry || 'N/A'}</p>
                    <p><strong>Market Cap:</strong> $${(properties.marcap / 1000000000).toFixed(2)} Billion</p>
                </div>
            `;
            const infoWindow = new google.maps.InfoWindow({
                content: infoWindowContent
            });

            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });

            markers.push(marker);
        } else {
            console.warn(`Skipped creating marker for ${properties.name} due to invalid coordinates or filters: ${coordinates}`);
        }
    });
}

// Function to trigger filtering when dropdowns change
function applyFilters() {
    displayCustomersOnMap();
}