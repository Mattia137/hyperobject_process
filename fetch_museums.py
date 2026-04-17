import sys
import json
import time
import wikipedia
import warnings
import urllib.parse
from SPARQLWrapper import SPARQLWrapper, JSON

warnings.filterwarnings('ignore', category=UserWarning, module='wikipedia')
if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(line_buffering=True)

# ==========================================================================
# Earth-Mars Bridge Project — @data Agent
# fetch_museums.py
# ==========================================================================

# WHITELIST Q-IDs:
# Q3196771: art museum (institution)
# Q207694: art museum (building)
# Q108860927: contemporary art museum
# Q15206795: exhibition space
# Q1329623: cultural center

SPARQL_QUERY = """
SELECT DISTINCT ?museum ?museumLabel ?wikipediaUrl ?coords ?cityLabel
WHERE {
  VALUES ?type { wd:Q3196771 wd:Q207694 wd:Q108860927 wd:Q15206795 wd:Q1329623 }
  ?museum wdt:P31 ?type .
  ?museum wdt:P625 ?coords .

  OPTIONAL {
    ?museum wdt:P131|wdt:P276 ?cityItem .
    ?cityItem rdfs:label ?cityLabel .
    FILTER(LANG(?cityLabel) = "en")
  }

  ?wikipediaUrl schema:about ?museum ;
                schema:inLanguage "en" ;
                schema:isPartOf <https://en.wikipedia.org/> .

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 200
"""

ART_KEYWORDS = [
    "contemporary art", "digital art", "new media", "media art",
    "interactive art", "experiential art", "space installation",
    "modern art", "digital media", "immersive", "electronic art", "technology"
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
    if not coord_str or not coord_str.startswith("Point("): return None
    try:
        inner = coord_str[6:-1]
        lon_s, lat_s = inner.split(" ")
        return float(lat_s), float(lon_s)
    except: return None

def check_art_focus(summary: str):
    lower_summary = summary.lower()
    for kw in ART_KEYWORDS:
        if kw in lower_summary: return True
    return False

def fetch_wikipedia_data(museum_name: str, url: str):
    try:
        title = urllib.parse.unquote(url.split('/')[-1])
        page = wikipedia.page(title, auto_suggest=False)
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

def main():
    print(">>> Querying Wikidata for museums and institutions ...")
    raw_results = run_sparql(SPARQL_QUERY)

    if not raw_results:
        print("No results returned or error occurred.")
        sys.exit(1)

    print(f"Total number of raw Wikidata results: {len(raw_results)}")

    final_data = []
    discarded = 0
    no_coords = 0
    total = len(raw_results)
    processed_museums = set()

    for idx, row in enumerate(raw_results, 1):
        museum_name = row.get("museumLabel", {}).get("value", "")
        wiki_url = row.get("wikipediaUrl", {}).get("value", "")
        coords_str = row.get("coords", {}).get("value", "")
        city = row.get("cityLabel", {}).get("value", "Unknown City")

        if not museum_name or museum_name in processed_museums or (museum_name.startswith("Q") and museum_name[1:].isdigit()):
            discarded += 1
            continue

        processed_museums.add(museum_name)
        print(f"[{idx}/{total}] Processing: {museum_name}")

        parsed_coords = parse_coords(coords_str)
        if not parsed_coords:
            print(f"  -> Dropped: No valid geographic coordinates found.")
            no_coords += 1
            discarded += 1
            continue

        lat, lon = parsed_coords
        time.sleep(0.1)

        wiki_data = fetch_wikipedia_data(museum_name, wiki_url)
        if not wiki_data:
            print(f"  -> Dropped: Could not fetch Wikipedia page.")
            discarded += 1
            continue

        summary = wiki_data["summary"]
        image_url = wiki_data["image_url"]

        if not summary:
            print(f"  -> Dropped: Empty Wikipedia summary.")
            discarded += 1
            continue

        if not image_url:
            print(f"  -> Dropped: No valid image found.")
            discarded += 1
            continue

        if not check_art_focus(summary):
            print(f"  -> Dropped: No focus on contemporary, digital, new media, or interactive art.")
            discarded += 1
            continue

        final_data.append({
            "museum_name": museum_name,
            "image_url": image_url,
            "description": summary,
            "city": city,
            "latitude": lat,
            "longitude": lon
        })

    with open("museums_data.json", "w", encoding="utf-8") as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)

    print("\n" + "="*50)
    print(f"COMPLETE: Generated museums_data.json with {len(final_data)} entries.")
    print(f"Discarded: {discarded} total (including {no_coords} with no valid coords).")
    print("="*50)

if __name__ == "__main__":
    main()
