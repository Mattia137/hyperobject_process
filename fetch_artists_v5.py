import warnings
warnings.filterwarnings('ignore', category=UserWarning, module='wikipedia')
import sys
import os
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(line_buffering=True)
import sys
import json
import time
import wikipedia
import urllib.parse
from SPARQLWrapper import SPARQLWrapper, JSON

# ==========================================================================
# Earth-Mars Bridge Project — @data Agent
# fetch_artists_v5.py
# ==========================================================================
# This script builds artists_data.json by fetching media artists active in
# the last 20 years (2006-2026), filtering via strict whitelist and blacklist,
# and enriching with Wikipedia API data.
# ==========================================================================

# WHITELIST (Q-IDs)
# Q378604: New media art
# Q860372: Digital art
# Q2394336: Interactive art
# Q212431: Installation art
# Q1421557: Light art
# Q1502032: Generative art
# Q466521: Kinetic art
# Q1744327: Sound art
# Q106195621: Computational design

# BLACKLIST (Q-IDs)
# Q33999: Actor
# Q947873: Television presenter
# Q1930187: Journalist
# Q2722764: Radio personality
# Q2526255: Film director
# Q639669: Musician
# Q177220: Singer
# Q138858: Entertainer

SPARQL_QUERY = """
SELECT DISTINCT ?artist ?artistLabel ?wikipediaUrl
       (GROUP_CONCAT(DISTINCT ?workLocStr; separator="|") AS ?workLocations)
       (GROUP_CONCAT(DISTINCT ?birthLocStr; separator="|") AS ?birthLocations)
       (GROUP_CONCAT(DISTINCT ?capLocStr; separator="|") AS ?capLocations)
WHERE {
  # WHITELIST: Explicitly linked domains
  VALUES ?domain { wd:Q378604 wd:Q860372 wd:Q2394336 wd:Q212431 wd:Q1421557 wd:Q1502032 wd:Q466521 wd:Q1744327 wd:Q106195621 }

  # Check across P106, P101, P136, P135
  ?artist wdt:P106|wdt:P101|wdt:P136|wdt:P135 ?domain .

  # Active over the last 20 years (approx 2006-2026)
  # Wrapped in OPTIONAL so we don't drop those without a death date (e.g. still alive)
  OPTIONAL { ?artist wdt:P570 ?dod . }
  FILTER(!BOUND(?dod) || YEAR(?dod) >= 2006)

  # BLACKLIST: Mandatory exclusions
  MINUS {
    ?artist wdt:P106 ?occ .
    ?occ wdt:P279* ?badOcc .
    VALUES ?badOcc { wd:Q33999 wd:Q947873 wd:Q1930187 wd:Q2722764 wd:Q2526255 wd:Q639669 wd:Q177220 wd:Q138858 }
  }

  # Must have an English Wikipedia article
  ?wikipediaUrl schema:about ?artist ;
                schema:inLanguage "en" ;
                schema:isPartOf <https://en.wikipedia.org/> .

  # Geo Priority 1: Work Location (P937)
  OPTIONAL {
    ?artist wdt:P937 ?workLoc .
    ?workLoc wdt:P625 ?workCoords .
    ?workLoc rdfs:label ?workCity .
    FILTER(LANG(?workCity) = "en")
    BIND(CONCAT(?workCity, "^", STR(?workCoords)) AS ?workLocStr)
  }

  # Geo Priority 2: City of Birth (P19)
  OPTIONAL {
    ?artist wdt:P19 ?birthCityItem .
    ?birthCityItem wdt:P625 ?birthCoords .
    ?birthCityItem rdfs:label ?birthCity .
    FILTER(LANG(?birthCity) = "en")
    BIND(CONCAT(?birthCity, "^", STR(?birthCoords)) AS ?birthLocStr)
  }

  # Geo Priority 3: Capital of Nationality/Citizenship (P27 -> P68)
  OPTIONAL {
    ?artist wdt:P27 ?country .
    ?country wdt:P68 ?capitalItem .
    ?capitalItem wdt:P625 ?capCoords .
    ?capitalItem rdfs:label ?capCity .
    FILTER(LANG(?capCity) = "en")
    BIND(CONCAT(?capCity, "^", STR(?capCoords)) AS ?capLocStr)
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?artist ?artistLabel ?wikipediaUrl
"""

NOTABILITY_KEYWORDS = [
    "exhibition", "exhibited", "gallery", "museum", "biennale", "festival",
    "award", "collection", "prize", "showcased", "installation"
]

def run_sparql(query: str):
    sparql = SPARQLWrapper("https://query.wikidata.org/sparql", agent="EarthMarsBridgeMiner/5.0")
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    try:
        results = sparql.query().convert()
        return results["results"]["bindings"]
    except Exception as exc:
        print(f"SPARQL error: {exc}")
        return []

def parse_coords(coord_str: str):
    # Formats Point(lon lat)
    if not coord_str or not coord_str.startswith("Point("):
        return None
    try:
        inner = coord_str[6:-1]
        lon_s, lat_s = inner.split(" ")
        return float(lat_s), float(lon_s)
    except:
        return None

def resolve_location(work_locs: str, birth_locs: str, cap_locs: str):
    # Priority 1: Work Location
    if work_locs:
        for loc in work_locs.split("|"):
            if "^" in loc:
                city, coords = loc.split("^", 1)
                parsed = parse_coords(coords)
                if parsed:
                    return {"city": city, "lat": parsed[0], "lon": parsed[1]}

    # Priority 2: City of Birth
    if birth_locs:
        for loc in birth_locs.split("|"):
            if "^" in loc:
                city, coords = loc.split("^", 1)
                parsed = parse_coords(coords)
                if parsed:
                    return {"city": city, "lat": parsed[0], "lon": parsed[1]}

    # Priority 3: Capital
    if cap_locs:
        for loc in cap_locs.split("|"):
            if "^" in loc:
                city, coords = loc.split("^", 1)
                parsed = parse_coords(coords)
                if parsed:
                    return {"city": city, "lat": parsed[0], "lon": parsed[1]}

    return None

def check_notability(summary: str):
    lower_summary = summary.lower()
    for kw in NOTABILITY_KEYWORDS:
        if kw in lower_summary:
            return True
    return False

def compute_score(summary: str, has_image: bool):
    length_score = min(40, int(len(summary) / 50))
    lower_summary = summary.lower()
    keyword_hits = sum(1 for kw in NOTABILITY_KEYWORDS if kw in lower_summary)
    keyword_score = min(40, keyword_hits * 4)
    image_score = 20 if has_image else 0
    return length_score + keyword_score + image_score

def fetch_wikipedia_data(artist_name: str):
    try:
        # Get page
        page = wikipedia.page(artist_name, auto_suggest=False)
        summary = page.summary

        # We need a main image. Wikipedia package usually returns a list of images.
        # We grab the first reasonable one that isn't an svg icon.
        images = page.images
        img_url = ""
        for img in images:
            if not img.lower().endswith('.svg'):
                img_url = img
                break

        return {"summary": summary, "image_url": img_url}
    except wikipedia.exceptions.DisambiguationError as e:
        # Try with the first option or specifically 'Name (artist)'
        try:
            page = wikipedia.page(f"{artist_name} (artist)", auto_suggest=False)
            summary = page.summary
            images = page.images
            img_url = ""
            for img in images:
                if not img.lower().endswith('.svg'):
                    img_url = img
                    break
            return {"summary": summary, "image_url": img_url}
        except:
            return None
    except wikipedia.exceptions.PageError:
        return None
    except Exception as e:
        return None

def main():
    print(">>> Querying Wikidata for media artists ...")
    raw_results = run_sparql(SPARQL_QUERY)

    if not raw_results:
        print("No results returned or error occurred.")
        sys.exit(1)

    print(f"Total number of raw Wikidata results: {len(raw_results)}")

    final_data = []
    discarded = 0
    no_coords = 0

    total = len(raw_results)

    for idx, row in enumerate(raw_results, 1):
        artist_name = row.get("artistLabel", {}).get("value", "")
        wiki_url = row.get("wikipediaUrl", {}).get("value", "")

        work_locs = row.get("workLocations", {}).get("value", "")
        birth_locs = row.get("birthLocations", {}).get("value", "")
        cap_locs = row.get("capLocations", {}).get("value", "")

        if not artist_name or (artist_name.startswith("Q") and artist_name[1:].isdigit()):
            discarded += 1
            continue

        print(f"[{idx}/{total}] Processing: {artist_name}")

        # Geographic Fallback Logic
        location = resolve_location(work_locs, birth_locs, cap_locs)
        if not location:
            print(f"  -> Dropped: No geographic coordinates found.")
            no_coords += 1
            discarded += 1
            continue

        # Wikipedia Validation & Enrichment
        # Only do requests if we don't already have one?
        # Actually Wikipedia API is rate limited, let's sleep briefly
        time.sleep(0.1)

        wiki_data = fetch_wikipedia_data(artist_name)
        if not wiki_data:
            print(f"  -> Dropped: Could not fetch Wikipedia page.")
            discarded += 1
            continue

        summary = wiki_data["summary"]
        image_url = wiki_data["image_url"]

        # Quality Filter
        if not summary:
            print(f"  -> Dropped: Empty Wikipedia summary.")
            discarded += 1
            continue

        if not image_url:
            print(f"  -> Dropped: No valid image found.")
            discarded += 1
            continue

        if not check_notability(summary):
            print(f"  -> Dropped: Zero evidence of exhibitions/notability in summary.")
            discarded += 1
            continue

        score = compute_score(summary, bool(image_url))

        # Build the JSON object according to app.js schema
        final_data.append({
            "name": artist_name,
            "description": summary[:900] + ("..." if len(summary) > 900 else ""),
            "notable_artworks": [], # Left empty as P800 was not strictly required by prompt but schema requires the key
            "locations": [location],
            "wiki_verified": True,
            "score": score,
            "mediums": ["media art"], # Defaulting to media art for now
            "image_url": image_url
        })

    # Sort and save
    final_data.sort(key=lambda x: x["score"], reverse=True)

    with open("artists_data.json", "w", encoding="utf-8") as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)

    print("\n" + "="*50)
    print(f"COMPLETE: Generated artists_data.json with {len(final_data)} profiles.")
    print(f"Discarded: {discarded} total (including {no_coords} with no coords).")
    print("="*50)

if __name__ == "__main__":
    main()
