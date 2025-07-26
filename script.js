let map;
let markers = []; // Array to hold all Google Maps markers
let allCustomersData = []; // Store all customer data from GeoJSON
let uniqueIndustries = new Set(); // To populate the industry filter

// Function to initialize the map (called by Google Maps API script)
function initMap() {
    console.log("initMap called: Initializing Google Map..."); // Log 1
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 39.8283, lng: -98.5795 }, // Centered on approximate geographical center of contiguous US for better visibility
        zoom: 4, // A higher zoom level to see regional details
        mapTypeControl: false, // Optional: remove map type control
        streetViewControl: false // Optional: remove street view control
    });
    console.log("Map initialized. Attempting to fetch GeoJSON..."); // Log 2

    // Load customer data from GeoJSON
    fetch("customers.geojson")
        .then((response) => {
            if (!response.ok) {
                // Check if the network request itself was successful
                throw new Error(`HTTP error! status: ${response.status} - Could not load customers.geojson`);
            }
            return response.json();
        })
        .then((data) => {
            console.log("GeoJSON data fetched successfully:", data); // Log 3: IMPORTANT! Check this output
            allCustomersData = data.features;
            console.log("Number of customer features loaded:", allCustomersData.length); // Log 4: Check if features array is populated
            populateIndustryFilter(); // Populate filter *before* displaying markers
            displayCustomersOnMap(); // Initial display of all customers
            console.log("Customers displayed on map (attempted)."); // Log 5
        })
        .catch((error) => console.error("Error loading or processing GeoJSON:", error)); // Log 6 (for any fetch/json errors)

    // Add event listeners for filters
    document.getElementById('industry-filter').addEventListener('change', applyFilters);
    document.getElementById('marcap-filter').addEventListener('change', applyFilters);
}

// Function to populate the industry filter dropdown
function populateIndustryFilter() {
    allCustomersData.forEach((customer) => {
        if (customer.properties.industry) {
            uniqueIndustries.add(customer.properties.industry);
        }
    });

    const industryFilter = document.getElementById("industry-filter");
    // Sort industries alphabetically
    Array.from(uniqueIndustries)
        .sort()
        .forEach((industry) => {
            const option = document.createElement("option");
            option.value = industry;
            option.textContent = industry;
            industryFilter.appendChild(option);
        });
}

// Function to get marker color based on industry
function getIndustryColor(industry) {
    // You can define a color palette here.
    const colors = {
        "Technology": "#4285F4", // Google Blue
        "Finance": "#DB4437",    // Google Red
        "Healthcare": "#0F9D58", // Google Green
        "Retail": "#F4B400",     // Google Yellow
        "Manufacturing": "#673AB7", // Deep Purple
        "Energy": "#FF5722", // Deep Orange
        "Automotive": "#00BCD4", // Cyan
        "Consumer Goods": "#E91E63", // Pink
    };
    return colors[industry] || "#757575"; // Default grey
}

// Function to get marker size (scaled icon) based on Marcap - NO LONGER DIRECTLY USED FOR AdvancedMarkerElement ICON SCALE
function getMarcapSize(marcap) {
    if (marcap < 1000000000) return 10; // This value will now control content size if you make custom marker.
    if (marcap >= 1000000000 && marcap < 10000000000) return 15;
    return 20;
}

// Function to clear all existing markers from the map
function clearMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].map = null; // Set map to null for AdvancedMarkerElement
    }
    markers = [];
}

// Function to display customers based on current filters
async function displayCustomersOnMap() { // Added async keyword here
    clearMarkers(); // Clear existing markers before adding new ones

    // Ensure the AdvancedMarkerElement library is loaded
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker"); // Import AdvancedMarkerElement

    const selectedIndustry = document.getElementById('industry-filter').value;
    const selectedMarcapTier = document.getElementById('marcap-filter').value;

    allCustomersData.forEach(customer => {
        const properties = customer.properties;
        const coordinates = customer.geometry.coordinates; // [longitude, latitude]

        let showCustomer = true;

        // Apply Industry Filter
        if (selectedIndustry !== 'all' && properties.industry !== selectedIndustry) {
            showCustomer = false;
        }

        // Apply Marcap Filter
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

        // Validate coordinates before creating marker
        if (showCustomer && coordinates && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number' && !isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
            const latLng = { lat: coordinates[1], lng: coordinates[0] }; // AdvancedMarkerElement prefers object for position

            // Create a simple custom content for the marker, colored by industry and sized by marcap
            const markerContent = document.createElement('div');
            markerContent.style.backgroundColor = getIndustryColor(properties.industry);
            markerContent.style.borderRadius = '50%';
            markerContent.style.width = `${getMarcapSize(properties.marcap)}px`;
            markerContent.style.height = `${getMarcapSize(properties.marcap)}px`;
            markerContent.style.border = '1px solid #333';
            markerContent.style.display = 'flex';
            markerContent.style.alignItems = 'center';
            markerContent.style.justifyContent = 'center';
            markerContent.style.color = 'white';
            markerContent.style.fontSize = '8px';
            // markerContent.textContent = properties.name.charAt(0); // Optional: first letter of name

            const marker = new AdvancedMarkerElement({ // Use AdvancedMarkerElement
                position: latLng,
                map: map,
                title: properties.name,
                content: markerContent, // Use custom content
            });

            console.log(`Created marker for ${properties.name} at Lat: ${coordinates[1]}, Lng: ${coordinates[0]}`);

            // Create an InfoWindow for each marker
            const infoWindowContent = `
                <div class="info-window">
                    <h3>${properties.name}</h3>
                    <p><strong>Address:</strong> ${properties.address || 'N/A'}</p>
                    <p><strong>Industry:</strong> ${properties.industry || 'N/A'}</p>
                    <p><strong>Market Cap:</strong> $${(properties.marcap / 1000000000).toFixed(2)} Billion</p>
                </div>
            `;
            const infoWindow = new google.maps.InfoWindow({
                content: infoWindowContent
            });

            // Add click listener to show InfoWindow
            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });

            markers.push(marker); // Add to our array of markers
        } else {
            console.warn(`Skipped creating marker for ${properties.name} due to invalid coordinates or filters: ${coordinates}`);
        }
    });
}

// Function to trigger filtering when dropdowns change
function applyFilters() {
    displayCustomersOnMap();
}