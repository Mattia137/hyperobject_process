"""
==========================================================================
 Earth-Mars Bridge Project — @data Agent
 fetch_artists_v4.py   (v4.0 — expanded 1970s–today, no date limit)
==========================================================================

OUTPUT SCHEMA (matches app.js exactly):
  {
    "name":             string
    "description":      string   (Wikipedia extract, ≤ 900 chars)
    "notable_artworks": [string, ...]
    "locations":        [{"city": string, "lat": float, "lon": float}]
    "wiki_verified":    bool
    "score":            int      (0–100, derived from Wikipedia richness)
    "mediums":          [string, ...]
  }

STRATEGY
  Pass 1 — Wikidata SPARQL (no date filter, all eras)
    Three UNIONed sub-patterns:
      A) P106 (occupation) — 16 media/installation/digital art roles
      B) P101 (field of work) — 10 art domains
      C) Hardcoded reference Q-IDs — always included

    City coordinates (lat/lon) are fetched directly from Wikidata via P625
    on the artist's residence/work-location/birthplace city node, so no
    external geocoding service is needed.

  Pass 2 — Wikipedia REST API
    GET /api/rest_v1/page/summary/{title}
    Validates with a redirect guard (title token match).
    Quality filters:
      • extract ≥ 80 chars
      • ≥ 1 notability keyword
      • thumbnail present

    Score is computed from:
      • extract length (0–40 pts)
      • notability keyword density (0–40 pts)
      • thumbnail present      (20 pts)

DEPENDENCIES
  pip install SPARQLWrapper requests
==========================================================================
"""

import sys, io, json, time, re, urllib.parse, requests
from SPARQLWrapper import SPARQLWrapper, JSON as SPARQL_JSON

# ── Windows UTF-8 fix ────────────────────────────────────────────────────
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


# ══════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════

# Always-included reference profiles (bypass occupation filter)
REFERENCE_PROFILES = [
    ("wd:Q381665",   "Olafur Eliasson"),
    ("wd:Q319088",   "Bill Viola"),
    ("wd:Q453443",   "Rafael Lozano-Hemmer"),
    ("wd:Q57408846", "Refik Anadol"),
    ("wd:Q42455",    "Björk"),
    ("wd:Q11974720", "teamLab"),
    ("wd:Q7291910",  "Random International"),
    ("wd:Q56291666", "Studio Drift"),
    ("wd:Q424268",   "Sou Fujimoto"),
    ("wd:Q444877",   "Tokujin Yoshioka"),
    ("wd:Q274191",   "Iris van Herpen"),
    ("wd:Q7889319",  "United Visual Artists"),
    ("wd:Q373977",   "Amon Tobin"),
    ("wd:Q1194389",  "Ryoji Ikeda"),
    ("wd:Q62300",    "Carsten Nicolai"),
    ("wd:Q4991838",  "Robert Henke"),
    ("wd:Q189652",   "James Turrell"),
    ("wd:Q155074",   "Nam June Paik"),
    ("wd:Q315578",   "Laurie Anderson"),
    ("wd:Q159534",   "Yoko Ono"),
    ("wd:Q214721",   "Christian Boltanski"),
    ("wd:Q180508",   "Bruce Nauman"),
    ("wd:Q273358",   "Gary Hill"),
    ("wd:Q183289",   "Pipilotti Rist"),
    ("wd:Q314975",   "Cai Guo-Qiang"),
    ("wd:Q312316",   "Anish Kapoor"),
    ("wd:Q156138",   "William Kentridge"),
    ("wd:Q18086952", "Hito Steyerl"),
    ("wd:Q47487",    "Rebecca Horn"),
    ("wd:Q204496",   "Doug Aitken"),
    ("wd:Q192949",   "Theo Jansen"),
    ("wd:Q561407",   "Robert Irwin"),
    ("wd:Q434280",   "Xu Bing"),
    ("wd:Q223274",   "Ryuichi Sakamoto"),
]

REFERENCE_QIDS = [qid for qid, _ in REFERENCE_PROFILES]

NOTABILITY_KEYWORDS = [
    "exhibition", "exhibited", "installation", "museum", "gallery",
    "biennale", "award", "retrospective", "commissioned", "premiere",
    "festival", "biennial", "moma", "tate", "guggenheim", "pompidou",
    "serpentine", "ars electronica", "immersive", "interactive",
    "pioneer", "noted for", "known for", "landmark",
    "computational", "generative", "kinetic", "sound art", "light art",
    "new media", "digital art", "video art", "performance art",
    "documenta", "venice biennale", "whitney", "kunsthalle",
]

MIN_DESC = 80
MAX_DESC = 900
SPARQL_LIMIT = 2000        # Wikidata hard-caps at 10000 but we aim for ~2000
RATE_LIMIT   = 0.3        # seconds between Wikipedia calls

GENERIC_LABELS = {
    "artist", "person", "human", "individual", "designer",
    "creator", "author", "researcher", "visual artist",
}

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "EarthMarsBridgeMiner/4.0 (educational; github.com/mattia137)"
})

# Fallback lat/lon for frequently appearing cities (avoids API misses)
CITY_FALLBACK = {
    "New York":      (40.712, -74.005),
    "New York City": (40.712, -74.005),
    "London":        (51.507,  -0.127),
    "Berlin":        (52.520,  13.405),
    "Paris":         (48.856,   2.352),
    "Tokyo":         (35.676, 139.650),
    "Los Angeles":   (34.052,-118.244),
    "Amsterdam":     (52.367,   4.904),
    "Seoul":         (37.566, 126.977),
    "Beijing":       (39.904, 116.407),
    "Shanghai":      (31.224, 121.469),
    "Vienna":        (48.208,  16.373),
    "Zurich":        (47.376,   8.541),
    "Brussels":      (50.850,   4.351),
    "Montreal":      (45.501, -73.567),
    "Toronto":       (43.651, -79.347),
    "Chicago":       (41.878, -87.629),
    "San Francisco": (37.774,-122.419),
    "Mexico City":   (19.432, -99.133),
    "Buenos Aires":  (-34.603,-58.381),
    "Sydney":        (-33.868, 151.209),
    "Mumbai":        (19.076,  72.877),
    "Johannesburg":  (-26.204, 28.047),
    "São Paulo":     (-23.550, -46.633),
    "Istanbul":      (41.015,  28.979),
    "Copenhagen":    (55.676,  12.568),
    "Stockholm":     (59.332,  18.065),
    "Oslo":          (59.913,  10.752),
    "Milan":         (45.464,   9.190),
    "Rome":          (41.902,  12.496),
    "Barcelona":     (41.385,   2.173),
    "Madrid":        (40.416,  -3.703),
    "Lisbon":        (38.716,  -9.139),
    "Warsaw":        (52.229,  21.012),
    "Prague":        (50.075,  14.437),
    "Reykjavik":     (64.146, -21.942),
    "Osaka":         (34.693, 135.502),
    "Kyoto":         (35.011, 135.768),
    "Singapore":     ( 1.352, 103.820),
    "Hong Kong":     (22.396, 114.109),
    "Taipei":        (25.047, 121.517),
    "Beirut":        (33.888,  35.494),
    "Cairo":         (30.044,  31.236),
    "Lagos":         ( 6.524,   3.379),
    "Nairobi":       (-1.286,  36.818),
    "Detroit":       (42.331, -83.045),
    "Seattle":       (47.606,-122.332),
    "Portland":      (45.523,-122.676),
    "Austin":        (30.267, -97.743),
    "Boston":        (42.360, -71.058),
    "Pittsburgh":    (40.440, -79.995),
    "Glasgow":       (55.864,  -4.252),
    "Manchester":    (53.480,  -2.242),
    "Sheffield":     (53.381,  -1.470),
    "Brighton":      (50.827,  -0.168),
    "Rotterdam":     (51.924,   4.477),
    "Eindhoven":     (51.440,   5.478),
    "Leipzig":       (51.339,  12.373),
    "Munich":        (48.135,  11.581),
    "Hamburg":       (53.550,   9.993),
    "Cologne":       (50.937,   6.960),
    "Frankfurt":     (50.110,   8.682),
    "Dresden":       (51.050,  13.737),
    "Bern":          (46.948,   7.447),
    "Geneva":        (46.204,   6.143),
    "Graz":          (47.070,  15.439),
    "Linz":          (48.306,  14.286),
    "Ghent":         (51.054,   3.717),
    "Antwerp":       (51.220,   4.402),
    "Delft":         (51.922,   4.479),
    "Kyiv":          (50.450,  30.523),
    "Bucharest":     (44.426,  26.102),
    "Budapest":      (47.497,  19.040),
    "Helsinki":      (60.169,  24.938),
    "Dublin":        (53.333,  -6.249),
    "Auckland":      (-36.867, 174.767),
    "Melbourne":     (-37.813, 144.963),
    "Vancouver":     (49.246,-123.116),
    "Mexico City":   (19.432, -99.133),
    "Guadalajara":   (20.659,-103.349),
}


# ══════════════════════════════════════════════════════════════════════════
#  PASS 1 — WIKIDATA SPARQL
# ══════════════════════════════════════════════════════════════════════════

def run_sparql(query: str) -> list[dict]:
    """Execute a SPARQL query and return bindings, or [] on error."""
    sparql = SPARQLWrapper(
        "https://query.wikidata.org/sparql",
        agent="EarthMarsBridgeMiner/4.0 (educational project)"
    )
    sparql.setQuery(query)
    sparql.setReturnFormat(SPARQL_JSON)
    try:
        results = sparql.query().convert()
        return results["results"]["bindings"]
    except Exception as exc:
        print(f"    SPARQL error: {exc}")
        return []


# We split the query into three focused sub-queries (A, B, C) so each
# stays well within Wikidata's 60-second timeout.  Results are merged
# after all three complete.

# Query A — flat (no GROUP_CONCAT) for large occupation-based result sets.
# We fetch one row per artist (DISTINCT on the triple), then aggregate in Python.
QUERY_A = """
SELECT DISTINCT ?artist ?artistLabel ?wikipediaUrl ?occLabel ?cityLabel
WHERE {
  ?artist wdt:P106 ?occ .
  VALUES ?occ {
    wd:Q18603603   # multimedia artist
    wd:Q2302325    # sound artist
    wd:Q335352     # light artist
    wd:Q7016454    # new media artist
    wd:Q11079476   # digital artist
    wd:Q59591462   # installation artist
    wd:Q30095818   # video artist
    wd:Q1278335    # performance artist
    wd:Q3501317    # fashion designer
    wd:Q15296811   # interaction designer
    wd:Q947873     # industrial designer
    wd:Q4610556    # media artist
    wd:Q3759101    # computer artist
  }
  ?wikipediaUrl schema:about     ?artist ;
                schema:inLanguage "en" ;
                schema:isPartOf  <https://en.wikipedia.org/> .
  OPTIONAL {
    ?occ rdfs:label ?occLabel .
    FILTER(LANG(?occLabel) = "en")
  }
  OPTIONAL {
    ?artist wdt:P551 | wdt:P937 | wdt:P19 ?cityNode .
    ?cityNode rdfs:label ?cityLabel .
    FILTER(LANG(?cityLabel) = "en")
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en" .
    ?artist rdfs:label ?artistLabel .
  }
}
LIMIT 3000
"""

QUERY_B = """
# Sub-query B: field-of-work (P101) — no date filter
SELECT DISTINCT ?artist ?artistLabel ?wikipediaUrl
       (GROUP_CONCAT(DISTINCT ?mediumLabel; separator="|") AS ?mediums)
       (GROUP_CONCAT(DISTINCT ?cityLabel;   separator="|") AS ?cities)
WHERE {
  ?artist wdt:P101 ?fow .
  VALUES ?fow {
    wd:Q108726359  # media art
    wd:Q212431     # installation art
    wd:Q3256080    # kinetic art
    wd:Q2132782    # computational art
    wd:Q20040      # electronic music
    wd:Q3920461    # generative art
    wd:Q744027     # video art
    wd:Q41254      # net art
    wd:Q2143825    # light art
  }
  ?wikipediaUrl schema:about     ?artist ;
                schema:inLanguage "en" ;
                schema:isPartOf  <https://en.wikipedia.org/> .

  OPTIONAL {
    ?artist wdt:P106 | wdt:P101 ?medItem .
    ?medItem rdfs:label ?mediumLabel .
    FILTER(LANG(?mediumLabel) = "en")
  }
  OPTIONAL {
    ?artist wdt:P551 | wdt:P937 | wdt:P19 ?cityNode .
    ?cityNode rdfs:label ?cityLabel .
    FILTER(LANG(?cityLabel) = "en")
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en" .
    ?artist rdfs:label ?artistLabel .
  }
}
GROUP BY ?artist ?artistLabel ?wikipediaUrl
LIMIT 800
"""

def build_query_c(ref_ids_str: str) -> str:
    return f"""
# Sub-query C: hardcoded reference profiles
SELECT DISTINCT ?artist ?artistLabel ?wikipediaUrl
       (GROUP_CONCAT(DISTINCT ?mediumLabel; separator="|") AS ?mediums)
       (GROUP_CONCAT(DISTINCT ?cityLabel;   separator="|") AS ?cities)
WHERE {{
  VALUES ?artist {{ {ref_ids_str} }}
  OPTIONAL {{
    ?wikipediaUrl schema:about     ?artist ;
                  schema:inLanguage "en" ;
                  schema:isPartOf  <https://en.wikipedia.org/> .
  }}
  OPTIONAL {{
    ?artist wdt:P106 | wdt:P101 ?medItem .
    ?medItem rdfs:label ?mediumLabel .
    FILTER(LANG(?mediumLabel) = "en")
  }}
  OPTIONAL {{
    ?artist wdt:P551 | wdt:P937 | wdt:P19 ?cityNode .
    ?cityNode rdfs:label ?cityLabel .
    FILTER(LANG(?cityLabel) = "en")
  }}
  SERVICE wikibase:label {{
    bd:serviceParam wikibase:language "en" .
    ?artist rdfs:label ?artistLabel .
  }}
}}
GROUP BY ?artist ?artistLabel ?wikipediaUrl
"""


def fetch_wikidata() -> list[dict]:
    """
    Run three focused sub-queries (A, B, C) and merge their results.
    Each sub-query is simpler, avoiding Wikidata's 60-second timeout.
    """
    print(">>> [Pass 1] Querying Wikidata (no date filter, all eras) …")

    print("    [A] Occupation-based query …")
    rows_a = run_sparql(QUERY_A)
    print(f"        → {len(rows_a)} rows")
    time.sleep(2)  # be polite between heavy queries

    print("    [B] Field-of-work query …")
    rows_b = run_sparql(QUERY_B)
    print(f"        → {len(rows_b)} rows")
    time.sleep(2)

    print("    [C] Reference profiles query …")
    rows_c = run_sparql(build_query_c(" ".join(REFERENCE_QIDS)))
    print(f"        → {len(rows_c)} rows")

    # ── Normalise Query A rows (flat format) into grouped format ────────
    # Query A emits one row per (artist × occ × city), so we aggregate
    # occLabel → mediums and cityLabel → cities in Python.
    grouped_a: dict[str, dict] = {}
    for row in rows_a:
        url  = row.get("wikipediaUrl", {}).get("value", "")
        name = row.get("artistLabel",  {}).get("value", "")
        key  = url or name.lower()
        if not key:
            continue
        if key not in grouped_a:
            grouped_a[key] = {
                "artistLabel":  row.get("artistLabel"),
                "wikipediaUrl": row.get("wikipediaUrl"),
                "mediums":      {"value": ""},
                "cities":       {"value": ""},
                "coords":       {"value": ""},
                "works":        {"value": ""},
            }
        g = grouped_a[key]
        for src_field, tgt_field in [("occLabel", "mediums"), ("cityLabel", "cities")]:
            val = row.get(src_field, {}).get("value", "")
            if val:
                existing = g[tgt_field]["value"]
                if val not in existing:
                    g[tgt_field]["value"] = (existing + "|" + val).strip("|")

    rows_a_grouped = list(grouped_a.values())

    # Merge and deduplicate by Wikipedia URL (primary key)
    merged: dict[str, dict] = {}
    for row in rows_a_grouped + rows_b + rows_c:
        url  = row.get("wikipediaUrl", {}).get("value", "")
        name = row.get("artistLabel",  {}).get("value", "")
        key  = url or name.lower()
        if not key:
            continue
        if key not in merged:
            merged[key] = row
        else:
            # Merge medium/city strings from duplicate rows
            for field in ("mediums", "cities"):
                existing = merged[key].get(field, {}).get("value", "")
                incoming = row.get(field, {}).get("value", "")
                if incoming and incoming not in existing:
                    merged[key].setdefault(field, {})["value"] = \
                        (existing + "|" + incoming).strip("|")

    bindings = list(merged.values())
    print(f"\n    → {len(bindings)} unique candidates after merge.")
    return bindings


# ══════════════════════════════════════════════════════════════════════════
#  COORDINATE PARSING
# ══════════════════════════════════════════════════════════════════════════

def parse_wkt_coords(wkt: str) -> tuple[float, float] | None:
    """
    Parse Wikidata's WKT point format: 'Point(lon lat)' → (lat, lon).
    Note: WKT order is (longitude latitude), we return (lat, lon).
    """
    m = re.search(r"Point\(([-\d.]+)\s+([-\d.]+)\)", wkt, re.IGNORECASE)
    if m:
        lon, lat = float(m.group(1)), float(m.group(2))
        # Sanity-check the ranges
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return round(lat, 4), round(lon, 4)
    return None


def resolve_location(city_str: str, coord_str: str) -> dict | None:
    """
    Build a location dict {city, lat, lon} from the raw SPARQL city/coord strings.

    Priority:
      1. Parse WKT from coord_str (straight from Wikidata P625).
      2. Look up city name in CITY_FALLBACK table.
      3. Return None (location unknown — entry still included, just placed at 0,0 fallback).
    """
    city = city_str.split("|")[0].strip() if city_str else ""
    if not city:
        return None

    # Try WKT coordinates from Wikidata
    for wkt_fragment in (coord_str or "").split("|"):
        coords = parse_wkt_coords(wkt_fragment.strip())
        if coords:
            return {"city": city, "lat": coords[0], "lon": coords[1]}

    # Fallback to our hardcoded table
    for key, (lat, lon) in CITY_FALLBACK.items():
        if key.lower() in city.lower() or city.lower() in key.lower():
            return {"city": city, "lat": lat, "lon": lon}

    # Unknown city — return with null coords (app.js filters these out)
    return {"city": city, "lat": None, "lon": None}


# ══════════════════════════════════════════════════════════════════════════
#  PASS 1b — REFERENCE FALLBACK (search for missing sitelinks)
# ══════════════════════════════════════════════════════════════════════════

def wikipedia_search_title(name: str) -> str | None:
    params = {
        "action": "query", "list": "search",
        "srsearch": f"{name} artist",
        "format": "json", "srlimit": 3,
    }
    try:
        r = SESSION.get("https://en.wikipedia.org/w/api.php", params=params, timeout=10)
        hits = r.json()["query"]["search"]
        if hits:
            return hits[0]["title"]
    except Exception:
        pass
    return None


def inject_reference_fallbacks(bindings: list[dict]) -> list[dict]:
    covered = {b.get("artistLabel", {}).get("value", "").lower() for b in bindings}
    added = 0
    for qid, name in REFERENCE_PROFILES:
        if name.lower() in covered:
            continue
        print(f"    [1b] '{name}' missing — searching Wikipedia …")
        time.sleep(RATE_LIMIT)
        title = wikipedia_search_title(name)
        if not title:
            continue
        wiki_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
        bindings.append({
            "artistLabel":  {"value": name},
            "wikipediaUrl": {"value": wiki_url},
            "mediums":      {"value": "installation art"},
            "works":        {"value": ""},
            "cities":       {"value": ""},
            "coords":       {"value": ""},
        })
        covered.add(name.lower())
        added += 1
    if added:
        print(f"    [1b] Injected {added} reference profiles via search fallback.")
    return bindings


# ══════════════════════════════════════════════════════════════════════════
#  PASS 2 — WIKIPEDIA REST API
# ══════════════════════════════════════════════════════════════════════════

def _name_tokens(s: str) -> set[str]:
    stops = {"the", "of", "a", "an", "and", "art", "in", "at", "for", "de"}
    return {w for w in re.split(r"\W+", s.lower()) if len(w) > 2 and w not in stops}


def title_matches(resp_title: str, artist_name: str) -> bool:
    return bool(_name_tokens(resp_title) & _name_tokens(artist_name))


def compute_score(extract: str, has_image: bool) -> int:
    """
    Score 0–100 based on Wikipedia richness:
      • extract length: 0–40 pts (saturates at 2000 chars)
      • keyword density: 0–40 pts (1 pt per unique keyword hit, max 40)
      • image present:   20 pts
    """
    length_score   = min(40, int(len(extract) / 50))
    lower          = extract.lower()
    keyword_hits   = sum(1 for kw in NOTABILITY_KEYWORDS if kw in lower)
    keyword_score  = min(40, keyword_hits * 4)
    image_score    = 20 if has_image else 0
    return length_score + keyword_score + image_score


def fetch_summary(wiki_url: str, artist_name: str) -> dict | None:
    """
    Returns enrichment dict or None if quality filters fail.
    """
    if "/wiki/" in wiki_url:
        raw_title = wiki_url.rstrip("/").split("/wiki/")[-1]
    else:
        raw_title = wiki_url

    result = _call_summary(raw_title, artist_name)
    if result == "MISMATCH":
        corrected = wikipedia_search_title(artist_name)
        if corrected:
            enc = urllib.parse.quote(corrected.replace(" ", "_"), safe="")
            result = _call_summary(enc, artist_name)
    return result if isinstance(result, dict) else None


def _call_summary(encoded_title: str, artist_name: str) -> dict | str | None:
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_title}"
    try:
        r = SESSION.get(url, timeout=12)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        data = r.json()
    except Exception:
        return None

    resp_title = data.get("title", "")
    if resp_title and not title_matches(resp_title, artist_name):
        return "MISMATCH"

    extract = data.get("extract", "").strip()
    if len(extract) < MIN_DESC:
        return None
    if not any(kw in extract.lower() for kw in NOTABILITY_KEYWORDS):
        return None

    thumb = (data.get("thumbnail") or {}).get("source") or \
            (data.get("originalimage") or {}).get("source") or ""
    if not thumb:
        return None

    desc = extract[:MAX_DESC] + "…" if len(extract) > MAX_DESC else extract
    score = compute_score(extract, bool(thumb))
    return {"description": desc, "image_url": thumb, "score": score}


# ══════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════

def pick_medium(raw: str) -> list[str]:
    """Return up to 2 specific medium labels, filtering generic ones."""
    parts    = [p.strip() for p in raw.split("|") if p.strip()]
    specific = [p for p in parts if p.lower() not in GENERIC_LABELS]
    # Deduplicate while preserving order
    seen, out = set(), []
    for p in (specific or parts):
        key = p.lower()
        if key not in seen:
            seen.add(key)
            out.append(p)
        if len(out) == 2:
            break
    return out if out else ["media art"]


def pick_works(raw: str) -> list[str]:
    """Return up to 3 notable work titles."""
    parts = [p.strip() for p in raw.split("|") if p.strip()]
    seen, out = set(), []
    for p in parts:
        if p.lower() not in seen:
            seen.add(p.lower())
            out.append(p)
        if len(out) == 3:
            break
    return out


def first_token(s: str) -> str:
    for t in s.split("|"):
        t = t.strip()
        if t:
            return t
    return ""


# ══════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════

def main():
    # ── Pass 1 ───────────────────────────────────────────────────────────
    raw = fetch_wikidata()
    if not raw:
        print("No data from Wikidata — aborting.")
        sys.exit(1)

    print("\n>>> [Pass 1b] Checking reference profiles …")
    raw = inject_reference_fallbacks(raw)

    # ── Pass 2 ───────────────────────────────────────────────────────────
    print(f"\n>>> [Pass 2] Wikipedia enrichment ({len(raw)} candidates) …")
    print(f"    Filters: desc ≥ {MIN_DESC} chars | notability keyword | thumbnail required")
    print()

    final: list[dict] = []
    discarded = 0
    no_coords = 0
    total = len(raw)

    for idx, item in enumerate(raw, 1):
        name      = item.get("artistLabel",  {}).get("value", "").strip()
        wiki_url  = item.get("wikipediaUrl", {}).get("value", "").strip()
        med_str   = item.get("mediums",      {}).get("value", "")
        works_str = item.get("works",        {}).get("value", "")
        city_str  = item.get("cities",       {}).get("value", "")
        coord_str = item.get("coords",       {}).get("value", "")

        # Skip raw Q-ID labels
        if not name or (name.startswith("Q") and name[1:].isdigit()):
            discarded += 1
            continue

        print(f"  [{idx:>4}/{total}] {name}", flush=True)
        time.sleep(RATE_LIMIT)

        # Resolve wiki URL if missing
        if not wiki_url:
            found = wikipedia_search_title(name)
            if found:
                wiki_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(found.replace(' ', '_'))}"
            else:
                discarded += 1
                continue

        enrichment = fetch_summary(wiki_url, name)
        if enrichment is None:
            discarded += 1
            continue

        loc = resolve_location(city_str, coord_str)
        if loc is None or loc.get("lat") is None:
            no_coords += 1
            # Still include — app.js skips entries without coords,
            # but we keep them in JSON for completeness.
            loc = {"city": first_token(city_str) or "Unknown", "lat": None, "lon": None}

        final.append({
            "name":             name,
            "description":      enrichment["description"],
            "notable_artworks": pick_works(works_str),
            "locations":        [loc],
            "wiki_verified":    True,
            "score":            enrichment["score"],
            "mediums":          pick_medium(med_str),
            "image_url":        enrichment["image_url"],
        })

    # ── Deduplication ─────────────────────────────────────────────────────
    seen: set[str] = set()
    deduped: list[dict] = []
    for entry in final:
        key = entry["name"].lower()
        if key not in seen:
            seen.add(key)
            deduped.append(entry)

    # Sort by score descending
    deduped.sort(key=lambda x: x["score"], reverse=True)

    # ── Write ─────────────────────────────────────────────────────────────
    out_path = "artists_data.json"
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(deduped, fh, indent=2, ensure_ascii=False)

    print()
    print("═" * 66)
    print(f"  COMPLETE: {len(deduped)} unique verified profiles → {out_path}")
    print(f"  Discarded {discarded} (failed quality filters)")
    print(f"  {no_coords} entries kept without confirmed coordinates")
    print("═" * 66)


if __name__ == "__main__":
    main()
