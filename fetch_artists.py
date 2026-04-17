import sys
import json
import re
try:
    from SPARQLWrapper import SPARQLWrapper, JSON
except ImportError:
    print("Please install SPARQLWrapper: pip install SPARQLWrapper")
    sys.exit(1)

def main():
    endpoint_url = "https://query.wikidata.org/sparql"
    
    # 2006-2026 filter
    # We filter by living artists or artists who died on or after 2006
    query = """
    SELECT DISTINCT ?artist ?artistLabel ?description
           (GROUP_CONCAT(DISTINCT ?artworkLabel; separator=" | ") AS ?artworks) 
           (GROUP_CONCAT(DISTINCT ?mediumLabel; separator=" | ") AS ?mediums)
           (GROUP_CONCAT(DISTINCT ?locAndCoord; separator=" | ") AS ?locations_data)
    WHERE {
      # Q11079476: digital artist, Q7016454: new media artist
      { ?artist wdt:P106/wdt:P279* wd:Q11079476. }
      UNION
      { ?artist wdt:P106/wdt:P279* wd:Q7016454. }
      
      # Filter for active between 2006-2026: living or died >= 2006
      OPTIONAL { ?artist wdt:P570 ?deathDate. }
      FILTER(!bound(?deathDate) || year(?deathDate) >= 2006)
      
      # Notable works
      OPTIONAL { 
        ?artist wdt:P800 ?artwork .
        ?artwork rdfs:label ?artworkLabel .
        FILTER (LANG(?artworkLabel) = "en")
      }
      
      # Mediums/technologies (material used: P186, genre: P136, instrument: P1303, uses: P2283)
      OPTIONAL {
        ?artist wdt:P186 | wdt:P136 | wdt:P1303 | wdt:P2283 ?medium .
        ?medium rdfs:label ?mediumLabel .
        FILTER(LANG(?mediumLabel) = "en")
      }
      
      # Location/Base (residence: P551, work location: P937, place of birth fallback: P19)
      OPTIONAL {
        ?artist wdt:P551 | wdt:P937 | wdt:P19 ?location .
        ?location rdfs:label ?locationLabel .
        FILTER(LANG(?locationLabel) = "en")
        OPTIONAL { ?location wdt:P625 ?coords . }
        BIND(CONCAT(?locationLabel, " (", COALESCE(STR(?coords), "no coords"), ")") AS ?locAndCoord)
      }
      
      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "en". 
        ?artist rdfs:label ?artistLabel .
        ?artist schema:description ?description .
      }
    }
    GROUP BY ?artist ?artistLabel ?description
    LIMIT 2500
    """
    
    user_agent = "DataExtractionBot/1.0 (mattia137@github.com)"
    sparql = SPARQLWrapper(endpoint_url, agent=user_agent)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    
    print("Querying Wikidata for media/digital artists (this may take a moment)...")
    try:
        results = sparql.query().convert()
    except Exception as e:
        print(f"Error querying Wikidata: {e}")
        return
        
    artists_data = []
    
    for result in results["results"]["bindings"]:
        # Skip items without a proper label
        name = result.get("artistLabel", {}).get("value", "")
        if name.startswith("Q") and name[1:].isdigit():
            continue
            
        artist = {
            "name": name,
            "description": result.get("description", {}).get("value", ""),
            "notable_artworks": result.get("artworks", {}).get("value", "").split(" | ") if result.get("artworks", {}).get("value", "") else [],
            "mediums": result.get("mediums", {}).get("value", "").split(" | ") if result.get("mediums", {}).get("value", "") else []
        }
        
        # Parse locations and coordinates
        locations_parsed = []
        locs_raw = result.get("locations_data", {}).get("value", "").split(" | ") if result.get("locations_data", {}).get("value", "") else []
        for loc in locs_raw:
            if not loc: continue
            match = re.match(r"(.*) \(Point\(([-\d\.]+) ([-\d\.]+)\)\)", loc)
            if match:
                city = match.group(1).strip()
                lon = float(match.group(2))
                lat = float(match.group(3))
                locations_parsed.append({"city": city, "lon": lon, "lat": lat})
            else:
                city = loc.replace(" (no coords)", "").strip()
                if city:
                    locations_parsed.append({"city": city, "lon": None, "lat": None})
        
        # Deduplicate cities
        seen_cities = set()
        unique_locations = []
        for loc in locations_parsed:
            if loc["city"] not in seen_cities:
                seen_cities.add(loc["city"])
                unique_locations.append(loc)
                
        artist["locations"] = unique_locations
        
        # Clean up empty strings
        artist["notable_artworks"] = [a for a in artist["notable_artworks"] if a]
        artist["mediums"] = [m for m in artist["mediums"] if m]
        
        artists_data.append(artist)
        
    with open("artists_data.json", "w", encoding="utf-8") as f:
        json.dump(artists_data, f, indent=4, ensure_ascii=False)
        
    print(f"Successfully retrieved {len(artists_data)} artists and saved to artists_data.json")

if __name__ == "__main__":
    main()
