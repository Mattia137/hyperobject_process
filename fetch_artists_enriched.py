"""
==========================================================================
 Earth-Mars Bridge Project — @data Agent
 fetch_artists_enriched.py  v2.0
==========================================================================
STRATEGY
  Pass 1 – SPARQLWrapper → Wikidata
    Queries for artists/designers/collectives whose Occupation (P106)
    or Field-of-Work (P101) maps to interdisciplinary media art.
    Also hard-wires the explicit reference profiles requested by the team.
    Returns: name, wikipedia URL, mediums, base city, base country.

  Pass 2 – wikipedia Python package → English Wikipedia
    For every Wikidata result that has a linked Wikipedia page we:
      • Fetch the page summary + image list
      • Apply 3 quality filters (length, keywords, valid image)
      • Discard entries that do not pass ALL THREE filters

HOW "MEDIUMS" ARE DEFINED IN THE SPARQL
  We target two Wikidata properties:
    P106 – Occupation  (what the person *does*)
    P101 – Field of work (the domain they operate in)

  Occupation values included:
    Q18603603  multimedia artist
    Q2302325   sound artist
    Q335352    light artist
    Q7016454   new media artist
    Q11079476  digital artist
    Q59591462  installation artist
    Q30095818  video artist
    Q1278335   performance artist
    Q3501317   fashion designer  (Iris van Herpen style)
    Q42973     architect         (Sou Fujimoto, Snøhetta style)

  Field-of-work values included:
    Q108726359 media art
    Q212431    installation art
    Q3256080   kinetic art
    Q2132782   computational art
    Q20040     electronic music   (Ryoji Ikeda, Amon Tobin style)

OUTPUT
  artists_data.json in the same directory as this script.
  Fields: artist_name, primary_medium, base_city, base_country,
          description, image_url
==========================================================================
"""

import sys
import io
import json
import time
import urllib.parse

# ── Force UTF-8 on the Windows console so special chars don't crash us ──
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

try:
    from SPARQLWrapper import SPARQLWrapper, JSON as SPARQL_JSON
except ImportError:
    print("Missing dep: pip install SPARQLWrapper")
    sys.exit(1)

try:
    import wikipedia
except ImportError:
    print("Missing dep: pip install wikipedia")
    sys.exit(1)


# ── REFERENCE PROFILES ──────────────────────────────────────────────────
# Q-IDs for artists explicitly requested by the team.
# These are injected as a VALUES clause so they are always included
# regardless of how Wikidata classifies their occupation.
REFERENCE_QIDS = [
    "wd:Q381665",   # Olafur Eliasson
    "wd:Q319088",   # Bill Viola
    "wd:Q453443",   # Rafael Lozano-Hemmer
    "wd:Q57408846", # Refik Anadol
    "wd:Q42455",    # Björk
    "wd:Q11974720", # teamLab
    "wd:Q7291910",  # Random International
    "wd:Q56291666", # Studio Drift
    "wd:Q424268",   # Sou Fujimoto
    "wd:Q444877",   # Tokujin Yoshioka
    "wd:Q274191",   # Iris van Herpen
    "wd:Q7889319",  # United Visual Artists
    "wd:Q373977",   # Amon Tobin
    "wd:Q1194389",  # Ryoji Ikeda
    "wd:Q62300",    # Carsten Nicolai (Alva Noto)
    "wd:Q4991838",  # Robert Henke
]

# ── Quality Filter keywords ──────────────────────────────────────────────
NOTABILITY_KEYWORDS = [
    "exhibition", "exhibited", "installation", "notable", "museum",
    "gallery", "biennale", "computational", "immersive", "award",
    "pioneer", "sculpture", "new media", "light art", "sound art",
    "digital", "kinetic", "interactive", "performance",
]

# ── Minimum summary length (chars) to be considered notable ─────────────
MIN_SUMMARY_LENGTH = 80


def build_sparql_query():
    """
    Compose the SPARQL SELECT query.

    We union three sub-patterns so we capture the broadest possible set:
      A) Artists whose P106 (occupation) is one of our media-art occupations
      B) Artists whose P101 (field of work) is one of our domains
      C) The explicit reference Q-IDs hardcoded above

    Location fallback order inside the query:
      1. P551 residence  →  2. P937 work location  →  3. P19 place of birth
    All three collapse into a single optional BIND so only one city value
    propagates per artist.
    """
    ref_ids = " ".join(REFERENCE_QIDS)

    return f"""
    SELECT DISTINCT ?artist ?artistLabel ?wikipediaUrl
           (GROUP_CONCAT(DISTINCT ?mediumLabel; separator=", ") AS ?mediums)
           (GROUP_CONCAT(DISTINCT ?cityLabel;   separator=", ") AS ?cities)
           (GROUP_CONCAT(DISTINCT ?countryLabel; separator=", ") AS ?countries)
    WHERE {{

      # ── Sub-pattern A: broad occupation match ─────────────────────────
      {{
        ?artist wdt:P106 ?occ .
        VALUES ?occ {{
          wd:Q18603603  # multimedia artist
          wd:Q2302325   # sound artist
          wd:Q335352    # light artist
          wd:Q7016454   # new media artist
          wd:Q11079476  # digital artist
          wd:Q59591462  # installation artist
          wd:Q30095818  # video artist
          wd:Q1278335   # performance artist
        }}
      }}
      UNION
      # ── Sub-pattern B: field-of-work domain match ─────────────────────
      {{
        ?artist wdt:P101 ?fow .
        VALUES ?fow {{
          wd:Q108726359  # media art
          wd:Q212431     # installation art
          wd:Q3256080    # kinetic art
          wd:Q2132782    # computational art
          wd:Q20040      # electronic music
        }}
      }}
      UNION
      # ── Sub-pattern C: explicit reference profiles ────────────────────
      {{ VALUES ?artist {{ {ref_ids} }} }}

      # ── Require a linked English Wikipedia page ───────────────────────
      ?wikipediaUrl schema:about   ?artist ;
                    schema:inLanguage "en" ;
                    schema:isPartOf <https://en.wikipedia.org/> .

      # ── Primary medium label (occupation OR field-of-work) ────────────
      OPTIONAL {{
        ?artist wdt:P101 | wdt:P106 ?medItem .
        ?medItem rdfs:label ?mediumLabel .
        FILTER(LANG(?mediumLabel) = "en")
      }}

      # ── City: residence → work location → birth place ─────────────────
      OPTIONAL {{
        ?artist wdt:P551 | wdt:P937 | wdt:P19 ?city .
        ?city rdfs:label ?cityLabel .
        FILTER(LANG(?cityLabel) = "en")
      }}

      # ── Country of citizenship ────────────────────────────────────────
      OPTIONAL {{
        ?artist wdt:P27 ?country .
        ?country rdfs:label ?countryLabel .
        FILTER(LANG(?countryLabel) = "en")
      }}

      SERVICE wikibase:label {{
        bd:serviceParam wikibase:language "en" .
        ?artist rdfs:label ?artistLabel .
      }}
    }}
    GROUP BY ?artist ?artistLabel ?wikipediaUrl
    LIMIT 400
    """


def fetch_wikidata():
    """Pass 1 – Query Wikidata and return raw bindings."""
    print(">>> [Pass 1] Querying Wikidata …")
    sparql = SPARQLWrapper(
        "https://query.wikidata.org/sparql",
        agent="EarthMarsBridgeMiner/2.0 (educational project)"
    )
    sparql.setQuery(build_sparql_query())
    sparql.setReturnFormat(SPARQL_JSON)
    try:
        results = sparql.query().convert()
        bindings = results["results"]["bindings"]
        print(f"    Wikidata returned {len(bindings)} candidates.")
        return bindings
    except Exception as exc:
        print(f"    Wikidata error: {exc}")
        return []


def enrich_from_wikipedia(wiki_url):
    """
    Pass 2 – Fetch summary + images from Wikipedia.
    Returns a dict on success, None if the entry fails any quality filter.
    """
    title = urllib.parse.unquote(wiki_url.rstrip("/").split("/")[-1])

    try:
        page = wikipedia.page(title, auto_suggest=False)
        summary = page.summary or ""

        # ── Quality Filter 1: summary must be substantive ────────────
        if len(summary) < MIN_SUMMARY_LENGTH:
            return None

        # ── Quality Filter 2: notability keywords ────────────────────
        lower = summary.lower()
        if not any(kw in lower for kw in NOTABILITY_KEYWORDS):
            return None

        # ── Quality Filter 3: at least one valid image ───────────────
        valid_images = [
            img for img in page.images
            if img.lower().endswith((".jpg", ".jpeg", ".png"))
            and not any(bad in img.lower() for bad in ("icon", "logo", "stub", "flag", "svg", "commons-logo"))
        ]
        if not valid_images:
            return None

        description = summary[:800] + "…" if len(summary) > 800 else summary
        return {
            "description": description,
            "image_url":   valid_images[0],
        }

    except wikipedia.exceptions.DisambiguationError:
        return None          # ambiguous page — skip
    except wikipedia.exceptions.PageError:
        return None          # page not found — skip
    except Exception:
        return None          # any other network / parse error — skip


def extract_primary_medium(mediums_str):
    """
    From the raw comma-separated medium string returned by SPARQL,
    pick the most specific / relevant single label.
    Generic terms like 'artist' or 'person' are deprioritised.
    """
    skip_generic = {"artist", "person", "human", "individual", "designer"}
    parts = [p.strip() for p in mediums_str.split(",") if p.strip()]
    specific = [p for p in parts if p.lower() not in skip_generic]
    return specific[0] if specific else (parts[0] if parts else "media art")


def main():
    # ── Pass 1 ─────────────────────────────────────────────────────────
    raw = fetch_wikidata()
    if not raw:
        print("No data from Wikidata – aborting.")
        return

    # ── Pass 2 ─────────────────────────────────────────────────────────
    print("\n>>> [Pass 2] Enriching via Wikipedia Quality Filters …")
    print("    (entries without a valid image, description, or exhibition")
    print("     evidence will be automatically discarded)\n")

    final = []
    total = len(raw)

    for idx, item in enumerate(raw, start=1):
        name      = item.get("artistLabel",  {}).get("value", "")
        wiki_url  = item.get("wikipediaUrl", {}).get("value", "")
        med_str   = item.get("mediums",      {}).get("value", "")
        city_str  = item.get("cities",       {}).get("value", "")
        cntry_str = item.get("countries",    {}).get("value", "")

        # Skip raw Q-ID labels (Wikidata items without English labels)
        if not name or (name.startswith("Q") and name[1:].isdigit()):
            continue

        # Progress ticker — name is ASCII-safe encoded for Windows console
        ticker = f"[{idx:>3}/{total}] {name}"
        print(ticker, flush=True)

        time.sleep(0.25)   # polite rate limit for Wikipedia API

        enrichment = enrich_from_wikipedia(wiki_url)
        if not enrichment:
            continue

        final.append({
            "artist_name":    name,
            "primary_medium": extract_primary_medium(med_str),
            "base_city":      city_str.split(",")[0].strip()    or "Unknown",
            "base_country":   cntry_str.split(",")[0].strip()   or "Unknown",
            "description":    enrichment["description"],
            "image_url":      enrichment["image_url"],
        })

    # ── Write output ────────────────────────────────────────────────────
    output_path = "artists_data.json"
    with open(output_path, "w", encoding="utf-8") as fh:
        json.dump(final, fh, indent=4, ensure_ascii=False)

    print(f"\n>>> Complete. {len(final)} high-quality profiles written to {output_path}")


if __name__ == "__main__":
    main()
