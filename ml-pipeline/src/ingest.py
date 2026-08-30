"""SafePassage ML Pipeline — Ingestion Module

Queries iNaturalist structured field observations AND curated GBIF
roadkill datasets for India, deduplicates records, and exports clean
GeoJSON for downstream use.

Data sources:
- iNaturalist: structured field query for Roadkill=Yes observations
- GBIF: curated datasetKey queries for known roadkill datasets
  - India Roadkill Monitoring Project (491 records, CC-BY 4.0)
  - Anamalai Hills / Valparai Plateau (2,473 records, CC-BY 4.0)

GBIF free-text searches remain excluded (unreliable). Only specific,
DOI-backed datasets with structured Darwin Core records are merged.

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

# GBIF structured dataset keys — curated, DOI-backed roadkill datasets
# Only these specific datasets are merged (free-text GBIF searches excluded)
GBIF_STRUCTURED_DATASETS = [
    {
        "key": "f334ae5e-0991-44bb-b64b-d602f4c8c289",
        "title": "India Roadkill Monitoring Project",
        "doi": "10.15468/vbd39p",
        "license": "CC-BY 4.0",
        "record_count": 491,
    },
    {
        "key": "4c627c3e-5c70-4874-9c03-e8de46e4a9c3",
        "title": "Anamalai Hills / Valparai Plateau",
        "doi": "10.15468/qxb735",
        "license": "CC-BY 4.0",
        "record_count": 2473,
    },
]

GBIF_OCCURRENCE_API = "https://api.gbif.org/v1/occurrence/search"
GBIF_PAGE_SIZE = 300  # GBIF max per page


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


def query_gbif_structured_datasets(country: str = "IN") -> gpd.GeoDataFrame:
    """Query curated GBIF roadkill datasets by datasetKey.

    Unlike free-text GBIF searches (which are unreliable), these are
    specific, DOI-backed datasets with structured Darwin Core records.
    Each dataset has been quality-controlled by the publishing organization.

    Returns a GeoDataFrame with columns matching the iNaturalist schema:
    - observation_id: GBIF occurrence key (unique identifier)
    - species: species name
    - taxon_class: taxonomic class
    - observed_on: observation date
    - quality_grade: "research" (curated datasets are pre-validated)
    - longitude, latitude: coordinates in WGS84
    - source: "gbif_<dataset_title>" for provenance tracking
    - url: GBIF occurrence URL
    - place_id: India (6903)
    """
    all_records: List[Dict] = []

    for dataset in GBIF_STRUCTURED_DATASETS:
        dataset_key = dataset["key"]
        dataset_title = dataset["title"]
        offset = 0
        dataset_count = 0

        while True:
            params = {
                "datasetKey": dataset_key,
                "country": country,
                "hasCoordinate": "true",
                "limit": GBIF_PAGE_SIZE,
                "offset": offset,
            }
            try:
                resp = requests.get(GBIF_OCCURRENCE_API, params=params, timeout=60)
                resp.raise_for_status()
            except requests.RequestException as e:
                print(f"Warning: GBIF API request failed for {dataset_title}: {e}")
                break

            payload = resp.json()
            results = payload.get("results", [])
            if not results:
                break

            for rec in results:
                lon = rec.get("decimalLongitude")
                lat = rec.get("decimalLatitude")
                if lon is None or lat is None:
                    continue

                # Extract eventDate — GBIF uses ISO format
                event_date = rec.get("eventDate", "")

                all_records.append(
                    {
                        "observation_id": f"gbif_{rec.get('key')}",
                        "species": rec.get("species") or rec.get("scientificName") or "unknown",
                        "taxon_class": rec.get("class") or "unknown",
                        "observed_on": event_date,
                        "quality_grade": "research",  # curated datasets are pre-validated
                        "longitude": float(lon),
                        "latitude": float(lat),
                        "source": f"gbif_{dataset_title.lower().replace(' ', '_')}",
                        "url": f"https://www.gbif.org/occurrence/{rec.get('key')}",
                        "place_id": PLACE_ID,
                    }
                )
                dataset_count += 1

            offset += GBIF_PAGE_SIZE
            total_results = payload.get("count", 0)
            if offset >= total_results:
                break

        print(f"  GBIF {dataset_title}: {dataset_count} records ingested")

    if not all_records:
        return gpd.GeoDataFrame(columns=[], geometry=gpd.points_from_xy([], []), crs="EPSG:4326")

    gdf = gpd.GeoDataFrame(
        all_records,
        geometry=gpd.points_from_xy(
            [r["longitude"] for r in all_records],
            [r["latitude"] for r in all_records],
        ),
        crs="EPSG:4326",
    )
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
    """DEPRECATED: Free-text GBIF search — unreliable, kept for backward compat.

    Use query_gbif_structured_datasets() instead for curated, DOI-backed
    datasets with structured Darwin Core records.
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
    1. Queries iNaturalist for roadkill observations (structured field query)
    2. Queries curated GBIF datasets (India Roadkill Monitoring Project,
       Anamalai Hills) — DOI-backed, Darwin Core formatted
    3. Merges both sources into a unified dataset
    4. Deduplicates by observation_id
    5. Saves outputs to the specified directory

    Returns a dictionary with:
    - inaturalist_path: path to the iNaturalist observations GeoJSON
    - gbif_path: path to the GBIF observations GeoJSON
    - merged_path: path to the merged observations GeoJSON
    - summary_path: path to the ingestion summary JSON
    - summary: the summary dictionary
    - inaturalist_gdf: the iNaturalist GeoDataFrame
    - gbif_gdf: the GBIF GeoDataFrame
    - merged_gdf: the merged GeoDataFrame
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Ingesting iNaturalist structured observations...")
    inat = query_inaturalist_roadkill()
    inat = deduplicate_observations(inat)
    print(f"  iNaturalist: {len(inat)} records")

    print("Ingesting curated GBIF roadkill datasets...")
    gbif = query_gbif_structured_datasets()
    gbif = deduplicate_observations(gbif)
    print(f"  GBIF (merged): {len(gbif)} records")

    # Merge both sources into a unified dataset
    import pandas as pd
    merged = pd.concat([inat, gbif], ignore_index=True)
    merged = gpd.GeoDataFrame(merged, geometry="geometry", crs="EPSG:4326")
    merged = deduplicate_observations(merged)
    total_records = len(merged)
    print(f"  Merged total: {total_records} records")

    summary = {
        "inaturalist_count": int(len(inat)),
        "gbif_count": int(len(gbif)),
        "total_records": int(total_records),
        "schema_version": "v1",
        "ingestion_notes": (
            "iNaturalist: structured field query for Roadkill=Yes observations. "
            "GBIF: curated datasetKey queries for India Roadkill Monitoring Project "
            "(491 records, CC-BY 4.0) and Anamalai Hills/Valparai Plateau "
            "(2,473 records, CC-BY 4.0). Free-text GBIF searches excluded."
        ),
        "gbif_datasets": [
            {"title": ds["title"], "doi": ds["doi"], "license": ds["license"]}
            for ds in GBIF_STRUCTURED_DATASETS
        ],
        "honesty_ladder": {
            "structured_record_threshold": 150,
            "structured_records_collected": total_records,
            "status": "above_threshold" if total_records >= 150 else "below_threshold",
            "consequence": (
                "Structured record threshold met. Predictive model may be promoted "
                "once validated on held-out spatial splits."
                if total_records >= 150
                else "Predictive hotspot model demoted to secondary, low-confidence layer. "
                     "Evidence layer (descriptive collision corridors) is the headline feature."
            ),
            "progress_pct": min(100, round((total_records / 150) * 100)),
        },
    }

    inat_path = output_dir / "inaturalist_observations.geojson"
    gbif_path = output_dir / "gbif_observations.geojson"
    merged_path = output_dir / "merged_observations.geojson"
    summary_path = output_dir / "ingestion_summary.json"

    inat.to_file(inat_path, driver="GeoJSON")
    gbif.to_file(gbif_path, driver="GeoJSON")
    merged.to_file(merged_path, driver="GeoJSON")
    summary_path.write_text(json.dumps(summary, indent=2))

    return {
        "inaturalist_path": str(inat_path),
        "gbif_path": str(gbif_path),
        "merged_path": str(merged_path),
        "summary_path": str(summary_path),
        "summary": summary,
        "inaturalist_gdf": inat,
        "gbif_gdf": gbif,
        "merged_gdf": merged,
    }


if __name__ == "__main__":
    result = run_ingestion()
    print(json.dumps(result["summary"], indent=2))
