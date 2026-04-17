"""Post-process artists_data.json: fix missing coords and rescale scores."""
import json

CITY_EXTRA = {
    "Unknown": None,
    "United States": (38.9, -77.0),
    "Manhattan": (40.754, -73.984),
    "Denver": (39.739, -104.984),
    "Beverly Hills": (34.073, -118.400),
    "Bottrop": (51.524, 6.929),
    "Queens": (40.728, -73.795),
    "Joshua Tree": (34.135, -116.313),
    "Johannisthal": (52.448, 13.499),
    "Ann Arbor": (42.279, -83.732),
    "Bay Shore": (40.728, -73.247),
    "Santiago": (-33.456, -70.648),
    "Chennai": (13.082, 80.270),
    "Scarsdale": (40.989, -73.784),
    "Zoetermeer": (52.057, 4.494),
    "Leiden": (52.160, 4.497),
    "Isleworth": (51.476, -0.337),
    "Weymouth": (50.613, -2.456),
    "Cotonou": (6.367, 2.435),
    "Belo Horizonte": (-19.917, -43.935),
    "Chipping Norton": (51.941, -1.544),
    "Newcastle upon Tyne": (54.978, -1.618),
    "Hampstead": (51.556, -0.178),
    "Wall Lake": (42.264, -94.995),
    "Alexandria": (31.200, 29.918),
    "Venice": (45.434, 12.338),
    "Loudoun County": (39.087, -77.638),
    "Minneapolis": (44.977, -93.265),
    "Chicago": (41.878, -87.629),
    "Philadelphia": (39.952, -75.165),
    "Houston": (29.760, -95.369),
    "Atlanta": (33.749, -84.388),
    "Washington": (38.907, -77.037),
    "Washington D.C.": (38.907, -77.037),
    "Phoenix": (33.448, -112.074),
    "Cleveland": (41.499, -81.694),
    "Pittsburgh": (40.440, -79.995),
    "Nashville": (36.174, -86.768),
    "New Orleans": (29.951, -90.071),
    "Baltimore": (39.290, -76.612),
    "Miami": (25.774, -80.193),
    "Brooklyn": (40.678, -73.944),
    "Cambridge": (52.205, 0.119),
    "Oxford": (51.752, -1.257),
    "Edinburgh": (55.953, -3.189),
    "Cardiff": (51.481, -3.179),
    "Liverpool": (53.408, -2.991),
    "Leeds": (53.800, -1.549),
    "Nottingham": (52.955, -1.150),
    "Lyon": (45.750, 4.850),
    "Marseille": (43.296, 5.381),
    "Bordeaux": (44.841, -0.580),
    "Toulouse": (43.604, 1.444),
    "Nantes": (47.218, -1.553),
    "Strasbourg": (48.573, 7.752),
    "Lille": (50.629, 3.057),
    "Nice": (43.710, 7.262),
    "Vancouver": (49.246, -123.116),
    "Calgary": (51.048, -114.058),
    "Ottawa": (45.421, -75.697),
    "Adelaide": (-34.928, 138.601),
    "Perth": (-31.952, 115.861),
    "Brisbane": (-27.467, 153.028),
    "Auckland": (-36.867, 174.767),
    "Wellington": (-41.286, 174.776),
    "Cape Town": (-33.924, 18.424),
    "Durban": (-29.857, 30.985),
    "Lagos": (6.524, 3.379),
    "Accra": (5.556, -0.197),
    "Dakar": (14.692, -17.447),
    "Casablanca": (33.589, -7.604),
    "Tel Aviv": (32.085, 34.781),
    "Tehran": (35.694, 51.422),
    "Bangkok": (13.754, 100.502),
    "Kuala Lumpur": (3.148, 101.687),
    "Jakarta": (-6.211, 106.845),
    "Manila": (14.600, 120.984),
    "Mexico City": (19.432, -99.133),
    "Bogota": (4.711, -74.073),
    "Lima": (-12.046, -77.043),
    "Reykjavik": (64.146, -21.942),
    "Reykjav\u00edk": (64.146, -21.942),
    "Santa Fe": (35.687, -105.937),
    "Minneapolis": (44.977, -93.265),
    "Oakland": (37.804, -122.271),
    "Berkeley": (37.872, -122.273),
    "Santa Monica": (34.011, -118.496),
    "Pasadena": (34.148, -118.144),
    "Glasgow": (55.864, -4.252),
    "Manchester": (53.480, -2.242),
    "Sheffield": (53.381, -1.470),
    "Brighton": (50.827, -0.168),
    "Rotterdam": (51.924, 4.477),
    "Eindhoven": (51.440, 5.478),
    "Bern": (46.948, 7.447),
    "Geneva": (46.204, 6.143),
    "Linz": (48.306, 14.286),
    "Graz": (47.070, 15.439),
    "Ghent": (51.054, 3.717),
    "Antwerp": (51.220, 4.402),
    "Delft": (51.922, 4.479),
    "Warsaw": (52.229, 21.012),
    "Prague": (50.075, 14.437),
    "Budapest": (47.497, 19.040),
    "Bucharest": (44.426, 26.102),
    "Helsinki": (60.169, 24.938),
    "Dublin": (53.333, -6.249),
    "Lisbon": (38.716, -9.139),
    "Barcelona": (41.385, 2.173),
    "Milan": (45.464, 9.190),
    "Rome": (41.902, 12.496),
    "Naples": (40.853, 14.268),
    "Stockholm": (59.332, 18.065),
    "Copenhagen": (55.676, 12.568),
    "Oslo": (59.913, 10.752),
    "Dresden": (51.050, 13.737),
    "Leipzig": (51.339, 12.373),
    "Hamburg": (53.550, 9.993),
    "Cologne": (50.937, 6.960),
    "Frankfurt": (50.110, 8.682),
    "Munich": (48.135, 11.581),
    "New York": (40.712, -74.005),
    "New York City": (40.712, -74.005),
    "Los Angeles": (34.052, -118.244),
    "San Francisco": (37.774, -122.419),
    "Seattle": (47.606, -122.332),
    "London": (51.507, -0.127),
    "Berlin": (52.520, 13.405),
    "Paris": (48.856, 2.352),
    "Tokyo": (35.676, 139.650),
    "Amsterdam": (52.367, 4.904),
    "Seoul": (37.566, 126.977),
    "Beijing": (39.904, 116.407),
    "Shanghai": (31.224, 121.469),
    "Vienna": (48.208, 16.373),
    "Zurich": (47.376, 8.541),
    "Brussels": (50.850, 4.351),
    "Montreal": (45.501, -73.567),
    "Toronto": (43.651, -79.347),
    "Boston": (42.360, -71.058),
    "Austin": (30.267, -97.743),
    "Buenos Aires": (-34.603, -58.381),
    "Sydney": (-33.868, 151.209),
    "Osaka": (34.693, 135.502),
    "Kyoto": (35.011, 135.768),
    "Singapore": (1.352, 103.820),
    "Hong Kong": (22.396, 114.109),
    "Taipei": (25.047, 121.517),
    "Beirut": (33.888, 35.494),
    "Cairo": (30.044, 31.236),
    "Johannesburg": (-26.204, 28.047),
}

with open("artists_data.json", encoding="utf-8") as f:
    data = json.load(f)

# Fix coordinates
fixed = 0
for a in data:
    loc = a["locations"][0]
    if loc.get("lat") is None and loc.get("city"):
        city = loc["city"]
        coords = CITY_EXTRA.get(city)
        if not coords:
            for key, val in CITY_EXTRA.items():
                if val and (key.lower() in city.lower() or city.lower() in key.lower()):
                    coords = val
                    break
        if coords:
            loc["lat"] = coords[0]
            loc["lon"] = coords[1]
            fixed += 1

# Rescale scores to 45–95 range
raw_scores = [a["score"] for a in data]
mn, mx = min(raw_scores), max(raw_scores)
for a in data:
    if mx > mn:
        norm = (a["score"] - mn) / (mx - mn)
    else:
        norm = 0.5
    a["score"] = int(45 + norm * 50)

data.sort(key=lambda x: x["score"], reverse=True)

with open("artists_data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

has_coords = sum(1 for a in data if a["locations"][0].get("lat") is not None)
above75    = sum(1 for a in data if a["score"] > 75)
print(f"Fixed {fixed} missing coordinates")
print(f"Total with coords: {has_coords}/{len(data)}")
print(f"Score range: {min(a['score'] for a in data)}-{max(a['score'] for a in data)}")
print(f"Score > 75 (labeled): {above75}")
print()
print("Top 20 on map:")
for a in data[:20]:
    loc = a["locations"][0]
    has = "OK" if loc.get("lat") else "--"
    print(f"  [{has}] {a['score']:3}  {a['name']:35}  {loc.get('city','?')}")
