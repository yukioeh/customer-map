let map;
let markers = []; // Array to hold all Google Maps markers
let allCustomersData = []; // Store all customer data from GeoJSON
let uniqueIndustries = new Set(); // To populate the industry filter

// Function to initialize the map (called by Google Maps API script)
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20, lng: 0 }, // Center globally
    zoom: 2, // World view
    mapTypeControl: false, // Optional: remove map type control
    streetViewControl: false, // Optional: remove street view control
  });

  // Load customer data from GeoJSON
  fetch("customers.geojson")
    .then((response) => response.json())
    .then((data) => {
      allCustomersData = data.features;
      populateIndustryFilter(); // Populate filter *before* displaying markers
      displayCustomersOnMap(); // Initial display of all customers
    })
    .catch((error) => console.error("Error loading GeoJSON:", error));

  // Add event listeners for filters
  document
    .getElementById("industry-filter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("marcap-filter")
    .addEventListener("change", applyFilters);
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
  // For simplicity, let's use a basic hash-based color or a predefined set.
  const colors = {
    Technology: "#4285F4", // Google Blue
    Finance: "#DB4437", // Google Red
    Healthcare: "#0F9D58", // Google Green
    Retail: "#F4B400", // Google Yellow
    Manufacturing: "#673AB7", // Deep Purple
    Energy: "#FF5722", // Deep Orange
    Automotive: "#00BCD4", // Cyan
    "Consumer Goods": "#E91E63", // Pink
    // Add more as needed, or use a more dynamic color generation for many industries
  };
  return colors[industry] || "#757575"; // Default grey
}

// Function to get marker size (scaled icon) based on Marcap
function getMarcapSize(marcap) {
  if (marcap < 1000000000) return 10; // < $1B (Small)
  if (marcap >= 1000000000 && marcap < 10000000000) return 15; // $1B - $10B (Medium)
  return 20; // > $10B (Large)
}

// Function to clear all existing markers from the map
function clearMarkers() {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers = [];
}

// Function to display customers based on current filters
function displayCustomersOnMap() {
  clearMarkers(); // Clear existing markers before adding new ones

  const selectedIndustry = document.getElementById("industry-filter").value;
  const selectedMarcapTier = document.getElementById("marcap-filter").value;

  allCustomersData.forEach((customer) => {
    const properties = customer.properties;
    const coordinates = customer.geometry.coordinates; // [longitude, latitude]

    let showCustomer = true;

    // Apply Industry Filter
    if (
      selectedIndustry !== "all" &&
      properties.industry !== selectedIndustry
    ) {
      showCustomer = false;
    }

    // Apply Marcap Filter
    if (showCustomer && selectedMarcapTier !== "all") {
      const marcap = properties.marcap;
      if (selectedMarcapTier === "small" && marcap >= 1000000000) {
        showCustomer = false;
      } else if (
        selectedMarcapTier === "medium" &&
        (marcap < 1000000000 || marcap >= 10000000000)
      ) {
        showCustomer = false;
      } else if (selectedMarcapTier === "large" && marcap < 10000000000) {
        showCustomer = false;
      }
    }

    if (showCustomer) {
      const latLng = new google.maps.LatLng(coordinates[1], coordinates[0]); // Google Maps is (latitude, longitude)

      const markerSize = getMarcapSize(properties.marcap);
      const markerColor = getIndustryColor(properties.industry);

      // Create a custom SVG icon for the marker
      const svgMarker = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: markerColor,
        fillOpacity: 0.8,
        strokeColor: "#333",
        strokeWeight: 1,
        scale: markerSize, // Use scale for size
      };

      const marker = new google.maps.Marker({
        position: latLng,
        map: map,
        title: properties.name,
        icon: svgMarker, // Use the custom SVG icon
      });

      // Create an InfoWindow for each marker
      const infoWindowContent = `
                <div class="info-window">
                    <h3>${properties.name}</h3>
                    <p><strong>Address:</strong> ${
                      properties.address || "N/A"
                    }</p>
                    <p><strong>Industry:</strong> ${
                      properties.industry || "N/A"
                    }</p>
                    <p><strong>Market Cap:</strong> $${(
                      properties.marcap / 1000000000
                    ).toFixed(2)} Billion</p>
                </div>
            `;
      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent,
      });

      // Add click listener to show InfoWindow
      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      markers.push(marker); // Add to our array of markers
    }
  });
}

// Function to trigger filtering when dropdowns change
function applyFilters() {
  displayCustomersOnMap();
}
