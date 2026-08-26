"""SafePassage ML Pipeline — Feature Engineering Module

Joins cleaned observations to OSM road segments and environmental layers,
and builds a per-segment feature table for model training.
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict, List

import geopandas as gpd
import numpy as np
import pandas as pd
import requests
from shapely.geometry import LineString, Point

# Default Overpass API endpoint
OVERPASS_API = "https://overpass-api.de/api/interpreter"


def _build_overpass_query(bbox: tuple[float, float, float, float]) -> str:
    """Build Overpass QL to fetch highway ways within bbox."""
    south, west, north, east = bbox
    return f"""
    [out:json][timeout:60];
    (
      way["highway"]({south},{west},{north},{east});
    );
    out body;
    >;
    out skel qt;
    """


def fetch_osm_roads(bbox: tuple[float, float, float, float], cache_path: Path | None = None) -> gpd.GeoDataFrame:
    """Fetch OSM highway ways for the given bbox."""
    query = _build_overpass_query(bbox)
    resp = requests.post(OVERPASS_API, data={"data": query}, timeout=120)
    resp.raise_for_status()
    data = resp.json()

    nodes: Dict[str, tuple[float, float]] = {}
    ways: List[Dict] = []

    for elem in data.get("elements", []):
        if elem["type"] == "node":
            nodes[str(elem["id"])] = (elem["lon"], elem["lat"])
        elif elem["type"] == "way" and "nodes" in elem:
            ways.append(elem)

    records = []
    for way in ways:
        coords = []
        for nid in way.get("nodes", []):
            key = str(nid)
            if key in nodes:
                coords.append(nodes[key])
        if len(coords) < 2:
            continue

        tags = way.get("tags", {})
        highway = tags.get("highway", "unknown")
        name = tags.get("name", "")
        ref = tags.get("ref", "")
        records.append(
            {
                "osm_id": way["id"],
                "highway": highway,
                "name": name,
                "ref": ref,
                "geometry": LineString([(lon, lat) for lon, lat in coords]),
            }
        )

    gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")
    if cache_path:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        gdf.to_file(cache_path, driver="GeoJSON")
    return gdf


def fetch_worldcover_tiles(bbox: tuple[float, float, float, float]) -> gpd.GeoDataFrame:
    """Placeholder for ESA WorldCover fetch.

    In production, this would download and mosaic WorldCover 10m tiles
    for the bbox. For the hackathon, return an empty GeoDataFrame with
    the expected schema so downstream code does not break.
    """
    return gpd.GeoDataFrame(columns=["lc_class", "geometry"], geometry=[], crs="EPSG:4326")


def compute_road_features(observations: gpd.GeoDataFrame, roads: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Join observations to nearest road segment and compute per-segment features."""
    if observations.empty or roads.empty:
        return gpd.GeoDataFrame(columns=[], geometry=[], crs="EPSG:4326")

    joined = gpd.sjoin_nearest(observations.to_crs(roads.crs), roads, how="left", distance_col="distance_to_road")

    segment_groups = []
    for osm_id, group in joined.groupby("osm_id"):
        species_mix: Dict[str, int] = {}
        for taxon in group.get("taxon_class", []):
            taxon = str(taxon)
            species_mix[taxon] = species_mix.get(taxon, 0) + 1

        endangered_flag = bool(group.get("endangered_flag", pd.Series([False])).any())

        segment_groups.append(
            {
                "osm_id": osm_id,
                "observation_count": int(len(group)),
                "species_mix": species_mix,
                "endangered_flag": endangered_flag,
                "highway": group.get("highway", ["unknown"]).iloc[0],
                "ref": group.get("ref", [""]).iloc[0],
                "name": group.get("name", [""]).iloc[0],
                "distance_to_road_mean": float(group.get("distance_to_road", pd.Series([0])).mean()) if "distance_to_road" in group.columns else 0.0,
                "geometry": group.geometry.iloc[0],
            }
        )

    return gpd.GeoDataFrame(segment_groups, crs=roads.crs)


def build_feature_table(observations_path: Path, output_path: Path) -> Dict:
    """End-to-end feature builder: fetch roads, join observations, save segments."""
    observations = gpd.read_file(observations_path)
    if observations.empty:
        raise RuntimeError("No observations found at " + str(observations_path))

    bounds = observations.total_bounds
    bbox = (bounds[1], bounds[0], bounds[3], bounds[1] + (bounds[3] - bounds[0]))  # south, west, north, east
    # More robust bbox ordering
    minx, miny, maxx, maxy = observations.total_bounds
    bbox = (miny, minx, maxy, maxx)

    roads = fetch_osm_roads(bbox, cache_path=output_path.parent / "osm_roads.geojson")
    segments = compute_road_features(observations, roads)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    segments.to_file(output_path, driver="GeoJSON")

    return {
        "segments_path": str(output_path),
        "segment_count": int(len(segments)),
        "observation_count": int(len(observations)),
        "road_count": int(len(roads)),
    }
