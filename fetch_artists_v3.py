"""
==========================================================================
 Earth-Mars Bridge Project — @data Agent
 fetch_artists_v3.py   (v3.1 — robust rebuild with redirect guard)
==========================================================================

STRATEGY OVERVIEW
─────────────────
  Pass 1 — SPARQLWrapper → Wikidata
    We build a list of candidates using three parallel patterns:
      A) Occupation (P106) matches a curated set of media-art roles
      B) Field-of-work (P101) matches media/installation/kinetic domains
      C) A hardcoded VALUES block for the 16 explicit reference profiles
         (Eliasson, Viola, Anadol, teamLab, Björk, etc.)

    All three patterns are UNIONed so any match is included.
    For Sub-pattern C we OPTIONALLY require the Wikipedia sitelink
    so that reference profiles without sitelinks are still captured
    and handled via the Wikipedia search fallback in Pass 2.

  Pass 1b — Reference-profile Wikipedia search fallback
    For any reference profile Q-ID that does NOT appear in the SPARQL
    results (because it has no English Wikipedia sitelink in Wikidata),
    we hit the Wikipedia search API with the artist name to find the
    correct article title.  This covers e.g. teamLab (art collective).

  Pass 2 — Wikipedia REST API (Summary endpoint)
    We hit  https://en.wikipedia.org/api/rest_v1/page/summary/{title}
    which returns a JSON object containing:
      • extract        → human-readable description (1–3 paragraphs)
      • thumbnail      → properly scaled image HTTPS URL
      • originalimage  → full-resolution fallback

    REDIRECT GUARD: The REST API sometimes follows redirects silently
    and returns an unrelated article.  We validate the response by
    checking that the returned article title shares at least one
    significant word with the artist's expected name.  If it does not,
    we try a Wikipedia search-based title lookup as a fallback.

  Quality Filters (applied per entry in Pass 2)
    1. Description length ≥ 80 characters
    2. At least one notability keyword in the description
    3. A non-empty thumbnail URL must be present
    Any entry failing one or more filters is silently discarded.

HOW "MEDIUMS" ARE DEFINED IN THE SPARQL QUERY
──────────────────────────────────────────────
  Two Wikidata properties define the scope:

  P106 — Occupation (what the person / collective *does*):
    Q18603603   multimedia artist
    Q2302325    sound artist
    Q335352     light artist
    Q7016454    new media artist
    Q11079476   digital artist
    Q59591462   installation artist
    Q30095818   video artist
    Q1278335    performance artist
    Q3501317    fashion designer     (Iris van Herpen archetype)
    Q42973      architect            (Sou Fujimoto, BIG archetype)
    Q15296811   interaction designer
    Q947873     industrial designer  (Tokujin Yoshioka archetype)
    Q3282637    motion graphic designer
    Q4610556    media artist (broader catch-all)

  P101 — Field of work (the domain the artist operates in):
    Q108726359  media art
    Q212431     installation art
    Q3256080    kinetic art
    Q2132782    computational art
    Q20040      electronic music     (Ryoji Ikeda, Amon Tobin archetype)
    Q3920461    generative art
    Q744027     video art
    Q41254      net art

  Combining P106 and P101 in a UNION ensures we capture:
    • Artists labelled under a technical occupation (e.g. "digital artist")
    • Artists labelled under an art-domain (e.g. "computational art")
    • Hybrid practitioners like architects / fashion designers who are
      primarily known for immersive or media-driven work

OUTPUT SCHEMA (artists_data.json)
──────────────────────────────────
  [
    {
      "artist_name":    string   — display name
      "primary_medium": string   — first specific medium from Wikidata labels
      "base_city":      string   — first residence / work city (or "Unknown")
      "base_country":   string   — citizenship country (or "Unknown")
      "description":    string   — Wikipedia summary (≤ 800 chars + ellipsis)
      "image_url":      string   — HTTPS thumbnail URL from Wikipedia REST API
    },
    …
  ]

DEPENDENCIES
────────────
  pip install SPARQLWrapper requests
  (No `wikipedia` PyPI package needed — we use the REST API directly.)
==========================================================================
"""

import sys
import io
import json
import time
import re
import urllib.parse

import requests
from SPARQLWrapper import SPARQLWrapper, JSON as SPARQL_JSON

# ── Windows console UTF-8 fix ────────────────────────────────────────────
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


# ══════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════

# ── Reference profile Q-IDs — always included regardless of occupation ───
# If a Q-ID has no English Wikipedia sitelink in Wikidata the SPARQL query
# will not return it, so Pass 1b searches Wikipedia directly by name.
REFERENCE_PROFILES = [
    ("wd:Q381665",   "Olafur Eliasson"),     # light/space installation
    ("wd:Q319088",   "Bill Viola"),           # video art pioneer
    ("wd:Q453443",   "Rafael Lozano-Hemmer"),# interactive public installations
    ("wd:Q57408846", "Refik Anadol"),         # AI / data sculpture
    ("wd:Q42455",    "Björk"),                # multimedia / audiovisual performance
    ("wd:Q11974720", "teamLab"),              # immersive digital environments
    ("wd:Q7291910",  "Random International"), # kinetic / participatory sculpture
    ("wd:Q56291666", "Studio Drift"),         # light / nature-inspired installations
    ("wd:Q424268",   "Sou Fujimoto"),         # architect / immersive structures
    ("wd:Q444877",   "Tokujin Yoshioka"),     # design / light / material
    ("wd:Q274191",   "Iris van Herpen"),      # fashion / technology / biology
    ("wd:Q7889319",  "United Visual Artists"),# light / kinetic (UVA)
    ("wd:Q373977",   "Amon Tobin"),           # audiovisual performance
    ("wd:Q1194389",  "Ryoji Ikeda"),          # data / sound / light
    ("wd:Q62300",    "Carsten Nicolai"),      # sound / visual (Alva Noto)
    ("wd:Q4991838",  "Robert Henke"),         # sound / laser / generative
]

# Build the plain Q-ID list (used in SPARQL VALUES clause)
REFERENCE_QIDS = [qid for qid, _ in REFERENCE_PROFILES]

# Keywords that signal documented exhibition or institutional recognition.
# A Wikipedia summary must contain at least one to pass the notability filter.
NOTABILITY_KEYWORDS = [
    "exhibition", "exhibited", "installation", "museum", "gallery",
    "biennale", "award", "retrospective", "commissioned", "premiere",
    "festival", "biennial", "moma", "tate", "guggenheim", "centre pompidou",
    "serpentine", "ars electronica", "immersive", "interactive",
    "pioneer", "noted for", "known for",
    "computational", "generative", "kinetic", "sound art", "light art",
    "new media", "digital art", "video art", "performance art",
]

MIN_DESCRIPTION_LENGTH = 80    # chars
MAX_DESCRIPTION_LENGTH = 800   # chars (trimmed before saving)
WIKI_RATE_LIMIT_SEC    = 0.35  # seconds between Wikipedia API calls
SPARQL_LIMIT           = 600   # max results from Wikidata

# Labels too vague to use as a primary medium
GENERIC_LABELS = {
    "artist", "person", "human", "individual", "designer",
    "creator", "author", "researcher",
}

# ── Shared HTTP session with a polite User-Agent ─────────────────────────
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "EarthMarsBridgeMiner/3.1 (educational; github.com/mattia137)"
})


# ══════════════════════════════════════════════════════════════════════════
#  PASS 1 — WIKIDATA SPARQL
# ══════════════════════════════════════════════════════════════════════════

def build_sparql_query() -> str:
    """
    Compose the full SPARQL SELECT query.

    Pattern structure:
      UNION of:
        A — occupation (P106) match
        B — field-of-work (P101) match
        C — explicit reference Q-IDs (OPTIONAL Wikipedia link so they
            are returned even without a sitelink)

    NOTE: Sub-patterns A and B require a Wikipedia sitelink (line:
      ?wikipediaUrl schema:about ?artist …)
    Sub-pattern C uses OPTIONAL for that same triple so reference
    profiles missing a sitelink still appear in results — with an
    empty ?wikipediaUrl — and are then handled by the search fallback.

    Location fallback order:
      P551 (residence) → P937 (work location) → P19 (birth place)
    """
    ref_ids = " ".join(REFERENCE_QIDS)

    return f"""
    SELECT DISTINCT ?artist ?artistLabel ?wikipediaUrl
           (GROUP_CONCAT(DISTINCT ?mediumLabel; separator="|") AS ?mediums)
           (GROUP_CONCAT(DISTINCT ?cityLabel;   separator="|") AS ?cities)
           (GROUP_CONCAT(DISTINCT ?countryLabel; separator="|") AS ?countries)
    WHERE {{

      # ── A: broad occupation match ─────────────────────────────────────
      {{
        ?artist wdt:P106 ?occ .
        VALUES ?occ {{
          wd:Q18603603   # multimedia artist
          wd:Q2302325    # sound artist
          wd:Q335352     # light artist
          wd:Q7016454    # new media artist
          wd:Q11079476   # digital artist
          wd:Q59591462   # installation artist
          wd:Q30095818   # video artist
          wd:Q1278335    # performance artist
          wd:Q3501317    # fashion designer (Iris van Herpen archetype)
          wd:Q42973      # architect        (Sou Fujimoto archetype)
          wd:Q15296811   # interaction designer
          wd:Q947873     # industrial designer (Tokujin Yoshioka archetype)
          wd:Q3282637    # motion graphic designer
          wd:Q4610556    # media artist (broader catch-all)
        }}
        # A requires a confirmed sitelink
        ?wikipediaUrl schema:about     ?artist ;
                      schema:inLanguage "en" ;
                      schema:isPartOf  <https://en.wikipedia.org/> .
      }}
      UNION
      # ── B: field-of-work domain match ────────────────────────────────
      {{
        ?artist wdt:P101 ?fow .
        VALUES ?fow {{
          wd:Q108726359  # media art
          wd:Q212431     # installation art
          wd:Q3256080    # kinetic art
          wd:Q2132782    # computational art
          wd:Q20040      # electronic music
          wd:Q3920461    # generative art
          wd:Q744027     # video art
          wd:Q41254      # net art
        }}
        # B requires a confirmed sitelink
        ?wikipediaUrl schema:about     ?artist ;
                      schema:inLanguage "en" ;
                      schema:isPartOf  <https://en.wikipedia.org/> .
      }}
      UNION
      # ── C: explicit reference profiles — sitelink is OPTIONAL ────────
      # This ensures reference profiles appear in results even when they
      # have no English Wikipedia sitelink in Wikidata.  If ?wikipediaUrl
      # is unbound the Pass-1b search fallback will resolve the title.
      {{
        VALUES ?artist {{ {ref_ids} }}
        OPTIONAL {{
          ?wikipediaUrl schema:about     ?artist ;
                        schema:inLanguage "en" ;
                        schema:isPartOf  <https://en.wikipedia.org/> .
        }}
      }}

      # ── Medium labels: union of P101 + P106 ──────────────────────────
      OPTIONAL {{
        ?artist wdt:P101 | wdt:P106 ?medItem .
        ?medItem rdfs:label ?mediumLabel .
        FILTER(LANG(?mediumLabel) = "en")
      }}

      # ── Location: residence → work location → birth place ─────────────
      OPTIONAL {{
        ?artist wdt:P551 | wdt:P937 | wdt:P19 ?city .
        ?city rdfs:label ?cityLabel .
        FILTER(LANG(?cityLabel) = "en")
      }}

      # ── Country of citizenship ─────────────────────────────────────────
      OPTIONAL {{
        ?artist wdt:P27 ?country .
        ?country rdfs:label ?countryLabel .
        FILTER(LANG(?countryLabel) = "en")
      }}

      # ── Active period: living OR died on/after 2006 ────────────────────
      OPTIONAL {{ ?artist wdt:P570 ?deathDate . }}
      FILTER(!BOUND(?deathDate) || YEAR(?deathDate) >= 2006)

      SERVICE wikibase:label {{
        bd:serviceParam wikibase:language "en" .
        ?artist rdfs:label ?artistLabel .
      }}
    }}
    GROUP BY ?artist ?artistLabel ?wikipediaUrl
    LIMIT {SPARQL_LIMIT}
    """


def fetch_wikidata() -> list[dict]:
    """
    Execute the SPARQL query against Wikidata and return raw bindings.
    Returns an empty list on error.
    """
    print(">>> [Pass 1] Querying Wikidata SPARQL endpoint …")
    sparql = SPARQLWrapper(
        "https://query.wikidata.org/sparql",
        agent="EarthMarsBridgeMiner/3.1 (educational project)"
    )
    sparql.setQuery(build_sparql_query())
    sparql.setReturnFormat(SPARQL_JSON)

    try:
        results = sparql.query().convert()
        bindings = results["results"]["bindings"]
        print(f"    → Wikidata returned {len(bindings)} raw candidates.")
        return bindings
    except Exception as exc:
        print(f"    ERROR querying Wikidata: {exc}")
        return []


# ══════════════════════════════════════════════════════════════════════════
#  PASS 1b — REFERENCE PROFILE SEARCH FALLBACK
# ══════════════════════════════════════════════════════════════════════════

def wikipedia_search_title(artist_name: str) -> str | None:
    """
    Search the Wikipedia API for *artist_name* and return the title of the
    most relevant result, or None if nothing useful is found.

    We append context keywords to bias the search toward art/media results
    so we don't accidentally land on a disambiguation or unrelated page.
    """
    params = {
        "action":   "query",
        "list":     "search",
        "srsearch": f"{artist_name} artist art",
        "format":   "json",
        "srlimit":  3,
    }
    try:
        resp = SESSION.get(
            "https://en.wikipedia.org/w/api.php",
            params=params,
            timeout=10,
        )
        resp.raise_for_status()
        hits = resp.json()["query"]["search"]
        if hits:
            return hits[0]["title"]
    except Exception:
        pass
    return None


def inject_reference_fallbacks(
    bindings: list[dict],
    ref_profiles: list[tuple[str, str]],
) -> list[dict]:
    """
    Pass 1b — For each reference profile that is NOT already in *bindings*
    (because it has no Wikipedia sitelink), search Wikipedia for its title
    and inject a synthetic binding so Pass 2 can still enrich it.

    A profile is considered "already covered" if its display name appears
    in the existing binding set.
    """
    covered_names = {
        b.get("artistLabel", {}).get("value", "").lower()
        for b in bindings
    }

    injected = 0
    for qid, name in ref_profiles:
        if name.lower() in covered_names:
            continue  # already in results from SPARQL

        print(f"    [1b] '{name}' missing sitelink — searching Wikipedia …")
        time.sleep(WIKI_RATE_LIMIT_SEC)
        title = wikipedia_search_title(name)
        if not title:
            print(f"         Could not find a Wikipedia article for '{name}' — skipping.")
            continue

        wiki_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
        print(f"         Found: '{title}'  →  {wiki_url}")

        # Inject a minimal binding that mirrors the SPARQL structure
        bindings.append({
            "artistLabel":  {"value": name},
            "wikipediaUrl": {"value": wiki_url},
            "mediums":      {"value": "installation art"},  # default
            "cities":       {"value": ""},
            "countries":    {"value": ""},
            "_injected":    True,   # flag so we can log it
        })
        covered_names.add(name.lower())
        injected += 1

    if injected:
        print(f"    [1b] Injected {injected} reference profile(s) via search fallback.")
    return bindings


# ══════════════════════════════════════════════════════════════════════════
#  PASS 2 — WIKIPEDIA REST API ENRICHMENT
# ══════════════════════════════════════════════════════════════════════════

def _name_tokens(name: str) -> set[str]:
    """
    Return a set of lowercase word tokens from *name*, ignoring
    short stop-words so we don't false-match on 'the', 'of', etc.
    """
    stops = {"the", "of", "a", "an", "and", "art", "in", "at"}
    return {w for w in re.split(r"\W+", name.lower()) if len(w) > 2 and w not in stops}


def title_matches_artist(response_title: str, artist_name: str) -> bool:
    """
    Return True if *response_title* (from the REST API) shares at least one
    significant token with *artist_name*.

    This guards against silent redirects where the API returns an entirely
    unrelated article (e.g. 'teamLab' → 'OnlyOffice').
    """
    return bool(_name_tokens(response_title) & _name_tokens(artist_name))


def fetch_wikipedia_summary(wiki_url: str, artist_name: str) -> dict | None:
    """
    Call the Wikipedia REST summary endpoint and return a dict with
    'description' and 'image_url', or None if any quality filter fails.

    Endpoint:
      GET https://en.wikipedia.org/api/rest_v1/page/summary/{title}

    Redirect Guard:
      If the returned article title does not share any significant tokens
      with *artist_name*, we try a Wikipedia search for the correct title
      before giving up.

    Quality Filters:
      1. extract length ≥ MIN_DESCRIPTION_LENGTH
      2. At least one NOTABILITY_KEYWORD in extract
      3. thumbnail or originalimage URL must be present
    """
    # Derive title from URL (handles both /wiki/Title and bare title strings)
    if "/wiki/" in wiki_url:
        raw_title = wiki_url.rstrip("/").split("/wiki/")[-1]
    else:
        raw_title = wiki_url

    # --- Attempt 1: use the URL-derived title ---
    result = _call_summary_endpoint(raw_title, artist_name)
    if result == "REDIRECT_MISMATCH":
        # The API silently redirected to an unrelated article — search instead
        print(f"         Redirect mismatch for '{artist_name}' — falling back to search …")
        corrected = wikipedia_search_title(artist_name)
        if corrected:
            result = _call_summary_endpoint(
                urllib.parse.quote(corrected.replace(" ", "_"), safe=""),
                artist_name,
            )

    if isinstance(result, dict):
        return result
    return None


def _call_summary_endpoint(encoded_title: str, artist_name: str) -> dict | str | None:
    """
    Internal helper.  Calls the REST summary endpoint for *encoded_title*.

    Returns:
      dict              — success (description + image_url)
      "REDIRECT_MISMATCH" — the API returned an unrelated article
      None              — 404, network error, or failed quality filters
    """
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_title}"
    try:
        resp = SESSION.get(url, timeout=10)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return None

    # ── Redirect guard ────────────────────────────────────────────────────
    response_title = data.get("title", "")
    if response_title and not title_matches_artist(response_title, artist_name):
        return "REDIRECT_MISMATCH"

    extract = data.get("extract", "").strip()

    # Quality filter 1: substantive description
    if len(extract) < MIN_DESCRIPTION_LENGTH:
        return None

    # Quality filter 2: documented notability evidence
    if not any(kw in extract.lower() for kw in NOTABILITY_KEYWORDS):
        return None

    # Trim to our max length
    description = (
        extract[:MAX_DESCRIPTION_LENGTH] + "…"
        if len(extract) > MAX_DESCRIPTION_LENGTH
        else extract
    )

    # Quality filter 3: require a real image
    thumbnail = data.get("thumbnail", {})
    original  = data.get("originalimage", {})
    image_url = thumbnail.get("source") or original.get("source") or ""
    if not image_url:
        return None

    return {"description": description, "image_url": image_url}


# ══════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════

def extract_primary_medium(raw: str) -> str:
    """
    From the pipe-delimited medium string returned by SPARQL, return the
    single most informative label.

    Strategy:
      1. Split on '|', strip whitespace.
      2. Discard labels in GENERIC_LABELS.
      3. Return the first surviving specific label, or first generic, or
         'media art' as a last resort.
    """
    parts    = [p.strip() for p in raw.split("|") if p.strip()]
    specific = [p for p in parts if p.lower() not in GENERIC_LABELS]
    if specific:
        return specific[0]
    return parts[0] if parts else "media art"


def first_value(pipe_str: str) -> str:
    """Return the first non-empty token from a pipe-delimited string."""
    for token in pipe_str.split("|"):
        token = token.strip()
        if token:
            return token
    return ""


# ══════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════

def main():
    # ── Pass 1: Wikidata SPARQL ───────────────────────────────────────────
    raw_candidates = fetch_wikidata()
    if not raw_candidates:
        print("No data returned from Wikidata — aborting.")
        sys.exit(1)

    # ── Pass 1b: inject reference profiles missing from SPARQL results ────
    print("\n>>> [Pass 1b] Checking reference profiles for missing sitelinks …")
    raw_candidates = inject_reference_fallbacks(raw_candidates, REFERENCE_PROFILES)

    # ── Pass 2: Wikipedia enrichment + quality filtering ──────────────────
    print("\n>>> [Pass 2] Enriching via Wikipedia REST API …")
    print(f"    Filters: desc ≥ {MIN_DESCRIPTION_LENGTH} chars | notability keyword | image required")
    print()

    final: list[dict] = []
    total     = len(raw_candidates)
    discarded = 0

    for idx, item in enumerate(raw_candidates, start=1):
        name      = item.get("artistLabel",  {}).get("value", "").strip()
        wiki_url  = item.get("wikipediaUrl", {}).get("value", "").strip()
        med_str   = item.get("mediums",      {}).get("value", "")
        city_str  = item.get("cities",       {}).get("value", "")
        cntry_str = item.get("countries",    {}).get("value", "")

        # Skip raw Q-ID labels (Wikidata items without English labels)
        if not name or (name.startswith("Q") and name[1:].isdigit()):
            discarded += 1
            continue

        print(f"  [{idx:>3}/{total}] {name}", flush=True)

        time.sleep(WIKI_RATE_LIMIT_SEC)

        # If even after the fallback there's no URL, try a direct search
        if not wiki_url:
            found = wikipedia_search_title(name)
            if found:
                wiki_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(found.replace(' ', '_'))}"
            else:
                discarded += 1
                continue

        enrichment = fetch_wikipedia_summary(wiki_url, name)
        if enrichment is None:
            discarded += 1
            continue

        final.append({
            "artist_name":    name,
            "primary_medium": extract_primary_medium(med_str),
            "base_city":      first_value(city_str)   or "Unknown",
            "base_country":   first_value(cntry_str)  or "Unknown",
            "description":    enrichment["description"],
            "image_url":      enrichment["image_url"],
        })

    # ── Deduplicate by artist_name (SPARQL can return duplicate rows) ─────
    seen: set[str] = set()
    deduplicated   = []
    for entry in final:
        key = entry["artist_name"].lower()
        if key not in seen:
            seen.add(key)
            deduplicated.append(entry)

    # ── Write output ──────────────────────────────────────────────────────
    output_path = "artists_data.json"
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(deduplicated, fh, indent=4, ensure_ascii=False)

    print()
    print("═" * 64)
    print(f"  COMPLETE.  {len(deduplicated)} verified profiles  →  {output_path}")
    print(f"  Discarded {discarded} entries that failed quality filters.")
    print("═" * 64)


if __name__ == "__main__":
    main()
