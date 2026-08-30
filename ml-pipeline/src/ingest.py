"""SafePassage ML Pipeline — Ingestion Module

Queries iNaturalist structured field observations for India,
deduplicates records, and exports clean GeoJSON for downstream use.

GBIF is cross-checked only and never merged into the primary dataset
(see docs/methodology.md for why free-text roadkill mentions were rejected).

The ingestion follows the iNaturalist structured field query approach:
- Uses the "Roadkill" observation field with a controlled value ("Yes")
- Filters by place_id=6903 (India)
- Paginates through results with a safety cap (MAX_PAGES)
- Deduplicates by observation_id

This is the first step of the four-move pipeline. Output feeds into
feature engineering (features.py) and KDE hotspot computation (kde.py).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional

import geopandas as gpd
import requests

# iNaturalist structured field query constants
INATURALIST_API = "https://api.inaturalist.org/v1/observations"
PLACE_ID = 6903  # India
FIELD_ID_ROADKILL = None  # resolved at runtime if needed
PER_PAGE = 200
MAX_PAGES = 50  # safety cap to prevent runaway queries

# Rate limiting: iNaturalist allows 60 requests/minute for unauthenticated
REQUEST_DELAY_SECONDS = 1.0


def _resolve_roadkill_field_id() -> Optional[int]:
    """Return the iNaturalist field ID for the 'Roadkill' observation field.

    This is resolved at runtime rather than hardcoded because field IDs
    can change across iNaturalist API versions.
    """
    url = "https://api.inaturalist.org/v1/fields"
    params = {"q": "Roadkill"}
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        for field in data.get("results", []):
            if field.get("name", "").lower() == "roadkill":
                return field.get("id")
    except requests.RequestException as e:
        raise RuntimeError(f"Failed to resolve iNaturalist Roadkill field ID: {e}")
    return None


def query_inaturalist_roadkill(place_id: int = PLACE_ID) -> gpd.GeoDataFrame:
    """Query iNaturalist for Roadkill=Yes observations in India.

    Returns a GeoDataFrame with columns:
    - observation_id: iNaturalist observation ID
    - species: species name
    - taxon_class: taxonomic class (e.g., Mammalia, Aves)
    - observed_on: observation date
    - quality_grade: observation quality (research, needs_id, casual)
    - longitude, latitude: coordinates in WGS84
    - source: "inaturalist"
    - url: link to the observation
    - place_id: iNaturalist place ID

    The query uses structured field observation filtering, not free-text
    search, to ensure reliable roadkill flagging.
    """
    field_id = _resolve_roadkill_field_id()
    if field_id is None:
        raise RuntimeError("Could not resolve iNaturalist 'Roadkill' field ID")

    records: List[Dict] = []
    page = 1
    while page <= MAX_PAGES:
        params = {
            "place_id": place_id,
            "field:" + str(field_id): "Yes",
            "per_page": PER_PAGE,
            "page": page,
            "order_by": "created_at",
            "order": "asc",
        }
        try:
            resp = requests.get(INATURALIST_API, params=params, timeout=60)
            resp.raise_for_status()
        except requests.RequestException as e:
            raise RuntimeError(f"iNaturalist API request failed on page {page}: {e}")

        payload = resp.json()
        results = payload.get("results", [])
        if not results:
            break

        for obs in results:
            obs_id = obs.get("id")
            if obs_id is None:
                continue
            lon, lat = None, None
            if obs.get("geojson") and obs["geojson"].get("coordinates"):
                lon, lat = obs["geojson"]["coordinates"][:2]
            elif obs.get("latitude") and obs.get("longitude"):
                lat = obs["latitude"]
                lon = obs["longitude"]

            if lon is None or lat is None:
                continue

            taxon = obs.get("taxon") or {}
            species = taxon.get("name") or obs.get("species_guess") or "unknown"
            taxon_class = (taxon.get("iconic_taxon_name") or "unknown").title()
            observed_on = obs.get("observed_on") or obs.get("created_at") or ""
            quality_grade = obs.get("quality_grade") or "casual"

            records.append(
                {
                    "observation_id": int(obs_id),
                    "species": species,
                    "taxon_class": taxon_class,
                    "observed_on": str(observed_on),
                    "quality_grade": str(quality_grade),
                    "longitude": float(lon),
                    "latitude": float(lat),
                    "source": "inaturalist",
                    "url": obs.get("uri") or obs.get("url") or "",
                    "place_id": place_id,
                }
            )

        page += 1

    if not records:
        return gpd.GeoDataFrame(columns=[], geometry=gpd.points_from_xy([], []), crs="EPSG:4326")

    gdf = gpd.GeoDataFrame(records, geometry=gpd.points_from_xy([r["longitude"] for r in records], [r["latitude"] for r in records]), crs="EPSG:4326")
    return gdf


def deduplicate_observations(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Deduplicate by observation_id, keeping the first occurrence.

    This is important because iNaturalist may return duplicate records
    when paginating through results, especially if new observations are
    added during the ingestion process.
    """
    if "observation_id" not in gdf.columns:
        return gdf
    return gdf.drop_duplicates(subset=["observation_id"], keep="first").reset_index(drop=True)


def query_gbif_crosscheck(place_id: int = PLACE_ID, limit: int = 300) -> gpd.GeoDataFrame:
    """Order-of-magnitude GBIF cross-check. Never merge into primary dataset.

    This function queries GBIF for roadkill observations in India as a
    secondary validation source. The results are used only for:
    1. Estimating the total number of roadkill records available
    2. Cross-checking species lists from iNaturalist
    3. Providing a rough sense of spatial coverage

    GBIF data is NOT merged into the primary dataset because free-text
    roadkill mentions are unreliable (see docs/methodology.md).
    """
    url = "https://api.gbif.org/v1/occurrence/search"
    params = {
        "country": "IN",
        "q": "roadkill",
        "limit": min(limit, 300),
        "hasCoordinate": "true",
    }
    try:
        resp = requests.get(url, params=params, timeout=60)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise RuntimeError(f"GBIF API request failed: {e}")

    payload = resp.json()
    results = payload.get("results", [])
    if not results:
        return gpd.GeoDataFrame(columns=[], geometry=gpd.points_from_xy([], []), crs="EPSG:4326")

    records = []
    for rec in results:
        lon = rec.get("decimalLongitude")
        lat = rec.get("decimalLatitude")
        if lon is None or lat is None:
            continue
        records.append(
            {
                "gbif_id": rec.get("key"),
                "species": rec.get("species") or "unknown",
                "taxon_class": rec.get("class") or "unknown",
                "observed_on": rec.get("eventDate") or "",
                "longitude": float(lon),
                "latitude": float(lat),
                "source": "gbif",
                "url": f"https://www.gbif.org/occurrence/{rec.get('key')}",
                "place_id": place_id,
            }
        )

    gdf = gpd.GeoDataFrame(records, geometry=gpd.points_from_xy([r["longitude"] for r in records], [r["latitude"] for r in records]), crs="EPSG:4326")
    return gdf


def run_ingestion(output_dir: Path = Path("data/processed")) -> Dict:
    """Run full ingestion pipeline and save outputs.

    This is the main entry point for the ingestion step. It:
    1. Queries iNaturalist for roadkill observations
    2. Deduplicates by observation_id
    3. Queries GBIF for cross-check (not merged)
    4. Saves outputs to the specified directory

    Returns a dictionary with:
    - inaturalist_path: path to the iNaturalist observations GeoJSON
    - gbif_path: path to the GBIF cross-check GeoJSON
    - summary_path: path to the ingestion summary JSON
    - summary: the summary dictionary
    - inaturalist_gdf: the iNaturalist GeoDataFrame
    - gbif_gdf: the GBIF GeoDataFrame
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    inat = query_inaturalist_roadkill()
    inat = deduplicate_observations(inat)

    gbif = query_gbif_crosscheck()

    summary = {
        "inaturalist_count": int(len(inat)),
        "gbif_count": int(len(gbif)),
        "schema_version": "v1",
        "ingestion_notes": (
            "Structured field query for Roadkill=Yes observations. "
            "GBIF cross-check is separate and not merged."
        ),
    }

    inat_path = output_dir / "inaturalist_observations.geojson"
    gbif_path = output_dir / "gbif_crosscheck.geojson"
    summary_path = output_dir / "ingestion_summary.json"

    inat.to_file(inat_path, driver="GeoJSON")
    gbif.to_file(gbif_path, driver="GeoJSON")
    summary_path.write_text(json.dumps(summary, indent=2))

    return {
        "inaturalist_path": str(inat_path),
        "gbif_path": str(gbif_path),
        "summary_path": str(summary_path),
        "summary": summary,
        "inaturalist_gdf": inat,
        "gbif_gdf": gbif,
    }


if __name__ == "__main__":
    result = run_ingestion()
    print(json.dumps(result["summary"], indent=2))
