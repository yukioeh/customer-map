import pandas as pd
import requests
import json
import time

# --- Configuration ---
API_KEY = "AIzaSyBWeHM_RBXTZcw-asKF-V6qmIzcl2ZfBEs" # <--- REPLACE WITH YOUR GOOGLE CLOUD API KEY
INPUT_CSV = "SampleCustomerData.csv"
OUTPUT_GEOJSON = "samplecustomers.geojson"
GEOCODING_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
RATE_LIMIT_DELAY = 0.1 # seconds (to avoid hitting API limits)

# --- Load Data ---
try:
    df = pd.read_csv(INPUT_CSV)
except FileNotFoundError:
    print(f"Error: {INPUT_CSV} not found. Please ensure your customer data CSV is in the same directory.")
    exit()

# Add Latitude and Longitude columns if they don't exist
if 'Latitude' not in df.columns:
    df['Latitude'] = None
if 'Longitude' not in df.columns:
    df['Longitude'] = None

geojson_features = []

print(f"Starting geocoding for {len(df)} customers...")

# --- Geocode Addresses and Build GeoJSON ---
for index, row in df.iterrows():
    address = row['Address']
    customer_name = row['Customer Name']

    if pd.isna(address) or address.strip() == "":
        print(f"Skipping customer '{customer_name}' due to missing address.")
        continue

    # Check if already geocoded (optional, useful for resuming)
    if pd.notna(row['Latitude']) and pd.notna(row['Longitude']):
        print(f"Customer '{customer_name}' already geocoded. Skipping API call.")
        lat = row['Latitude']
        lon = row['Longitude']
    else:
        params = {
            "address": address,
            "key": API_KEY
        }
        try:
            response = requests.get(GEOCODING_BASE_URL, params=params)
            response.raise_for_status() # Raise an exception for HTTP errors
            result = response.json()

            if result['status'] == 'OK' and result['results']:
                location = result['results'][0]['geometry']['location']
                lat = location['lat']
                lon = location['lng']
                df.at[index, 'Latitude'] = lat
                df.at[index, 'Longitude'] = lon
                print(f"Geocoded '{customer_name}': Lat={lat}, Lng={lon}")
            else:
                print(f"Could not geocode '{customer_name}' ({address}): {result['status']}")
                lat, lon = None, None # Set to None if geocoding failed
        except requests.exceptions.RequestException as e:
            print(f"Network or API error for '{customer_name}' ({address}): {e}")
            lat, lon = None, None
        except KeyError:
            print(f"Unexpected API response for '{customer_name}' ({address}).")
            lat, lon = None, None

        time.sleep(RATE_LIMIT_DELAY) # Pause to respect API rate limits

    # Add to GeoJSON features if coordinates are available
    if lat is not None and lon is not None:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat] # GeoJSON is [longitude, latitude]
            },
            "properties": {
                "name": customer_name,
                "address": address,
                "marcap": row['Marcap'],
                "industry": row['Industry']
                # Add any other relevant columns from your CSV to properties
            }
        }
        geojson_features.append(feature)

# --- Save GeoJSON ---
geojson_data = {
    "type": "FeatureCollection",
    "features": geojson_features
}

with open(OUTPUT_GEOJSON, 'w') as f:
    json.dump(geojson_data, f, indent=2) # Use indent for readability

print(f"\nGeocoding complete. GeoJSON saved to '{OUTPUT_GEOJSON}'")
print(f"Updated CSV with Lat/Lng (if any new geocoding occurred) saved to '{INPUT_CSV}'")
# You might want to save the updated DataFrame back to CSV if you want to keep the Lat/Lng
df.to_csv(INPUT_CSV, index=False)