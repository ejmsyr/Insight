import requests
import json
import math
import sys
from tqdm import tqdm  # Loading bar

# Define Las Vegas bounding box
BOUNDS = {
    "min_lat": 36.0000,  # Southern Las Vegas
    "max_lat": 36.3000,  # Northern Las Vegas
    "min_lon": -115.4000,  # Western Las Vegas
    "max_lon": -115.0000   # Eastern Las Vegas
}

GRID_SPACING = 0.004167  # ~1/4 mile in latitude & longitude (half of previous)

# Function to get elevation for a given latitude and longitude
def get_elevation(lat, lon):
    url = f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lon}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()["results"][0]["elevation"]
    except Exception as e:
        tqdm.write(f"🚨 Error fetching elevation for ({lat}, {lon}): {e}")
    return None  # Return None if API call fails

# Generate elevation data grid
def generate_elevation_grid():
    num_rows = int((BOUNDS["max_lat"] - BOUNDS["min_lat"]) / GRID_SPACING)
    num_cols = int((BOUNDS["max_lon"] - BOUNDS["min_lon"]) / GRID_SPACING)

    elevation_grid = [[None for _ in range(num_cols)] for _ in range(num_rows)]

    tqdm.write(f"📍 Processing {num_rows} x {num_cols} grid (~{num_rows * num_cols} points)")

    total_cells = num_rows * num_cols
    progress_bar = tqdm(total=total_cells, desc="Fetching Elevation Data", unit="cells", file=sys.stdout)

    for i in range(num_rows):
        for j in range(num_cols):
            # Compute center coordinates for this cell
            center_lat = BOUNDS["min_lat"] + i * GRID_SPACING
            center_lon = BOUNDS["min_lon"] + j * GRID_SPACING

            # Compute northwest (1/8 mile up-left) & southeast (1/8 mile down-right)
            north_west_lat = center_lat + (GRID_SPACING / 2)
            north_west_lon = center_lon - (GRID_SPACING / 2)
            south_east_lat = center_lat - (GRID_SPACING / 2)
            south_east_lon = center_lon + (GRID_SPACING / 2)

            # Fetch elevation data
            nw_elev = get_elevation(north_west_lat, north_west_lon)
            se_elev = get_elevation(south_east_lat, south_east_lon)

            if nw_elev is not None and se_elev is not None:
                elevation_change = abs(nw_elev - se_elev)
            else:
                elevation_change = 0  # Default to 0 if API failed

            elevation_grid[i][j] = elevation_change

            # Update progress bar after every cell processed
            progress_bar.update(1)

    progress_bar.close()

    # Save grid to JSON
    with open("elevation_data.json", "w") as f:
        json.dump({"grid": elevation_grid}, f, indent=4)

    tqdm.write("✅ Elevation data saved to elevation_data.json")

# Run script
if __name__ == "__main__":
    generate_elevation_grid()
