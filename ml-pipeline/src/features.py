"""SafePassage ML Pipeline — Feature Engineering Module

Joins cleaned observations to OSM road segments and environmental layers
(OSM forest/water geometry — ESA WorldCover/WDPA remain a documented
upgrade path) and builds a per-segment feature table for model training.

Segments keep their real road LineString geometry; environmental features
are computed in a local metric CRS so distances are in metres.
"""
from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Dict, List

import geopandas as gpd
import numpy as np
import pandas as pd
import requests
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

# Default Overpass API endpoint
OVERPASS_API = "https://overpass-api.de/api/interpreter"

ROAD_CLASS_SCORES = {"motorway": 3, "trunk": 3, "primary": 2, "secondary": 1}
CORRIDOR_BUFFER_M = 500.0     # buffer around each segment for forest share
NEIGHBOUR_RADIUS_M = 2000.0   # radius for the spatial-lag density feature
NO_WATER_DISTANCE_M = 10000.0  # sentinel when no water geometry is in the bbox

# Maximum bbox size (degrees) for a single Overpass query
MAX_BBOX_DEG = 2.0  # ~220km — safe limit for Overpass API


def _split_bbox(
    bbox: tuple[float, float, float, float],
    max_deg: float = MAX_BBOX_DEG,
) -> list[tuple[float, float, float, float]]:
    """Split a large bbox into smaller chunks that Overpass can handle."""
    south, west, north, east = bbox
    chunks = []
    lat = south
    while lat < north:
        lon = west
        while lon < east:
            chunk_north = min(lat + max_deg, north)
            chunk_east = min(lon + max_deg, east)
            chunks.append((lat, lon, chunk_north, chunk_east))
            lon += max_deg
        lat += max_deg
    return chunks


def _fetch_overpass_chunked(
    query_fn,
    bbox: tuple[float, float, float, float],
    max_deg: float = MAX_BBOX_DEG,
) -> dict:
    """Fetch Overpass data for a large bbox by splitting into chunks."""
    chunks = _split_bbox(bbox, max_deg)
    all_elements = []

    for i, chunk in enumerate(chunks):
        query = query_fn(chunk)
        try:
            data = _fetch_overpass(query)
            elements = data.get("elements", [])
            all_elements.extend(elements)
            print(f"    Overpass chunk {i+1}/{len(chunks)}: {len(elements)} elements")
        except Exception as e:
            print(f"    Overpass chunk {i+1}/{len(chunks)} failed: {e}")
            continue

    return {"elements": all_elements}


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


def _fetch_overpass(query: str) -> dict:
    resp = requests.post(OVERPASS_API, data={"data": query}, timeout=120)
    resp.raise_for_status()
    return resp.json()


def _ways_to_geometries(data: dict, classify):
    """Turn Overpass node/way output into GeoDataFrame records.

    `classify(tags)` returns a class string; ways whose class is None are
    skipped. Closed ways become Polygons, open ways stay LineStrings.
    """
    nodes: Dict[str, tuple[float, float]] = {}
    ways: List[Dict] = []
    for elem in data.get("elements", []):
        if elem["type"] == "node":
            nodes[str(elem["id"])] = (elem["lon"], elem["lat"])
        elif elem["type"] == "way" and "nodes" in elem:
            ways.append(elem)

    records = []
    for way in ways:
        tags = way.get("tags", {})
        land_class = classify(tags)
        if land_class is None:
            continue
        coords = [nodes[str(nid)] for nid in way.get("nodes", []) if str(nid) in nodes]
        if len(coords) < 2:
            continue
        if land_class != "water" and len(coords) >= 4 and coords[0] == coords[-1]:
            geom = Polygon(coords)
        else:
            geom = LineString(coords)
        records.append({"land_class": land_class, "osm_id": way["id"], "geometry": geom})
    return records


def fetch_osm_roads(bbox: tuple[float, float, float, float], cache_path: Path | None = None) -> gpd.GeoDataFrame:
    """Fetch OSM highway ways for the given bbox.

    For large bboxes (>2° in any dimension), the query is automatically
    split into smaller chunks to avoid Overpass API limits.
    """
    data = _fetch_overpass_chunked(_build_overpass_query, bbox)

    nodes: Dict[str, tuple[float, float]] = {}
    ways: List[Dict] = []
    for elem in data.get("elements", []):
        if elem["type"] == "node":
            nodes[str(elem["id"])] = (elem["lon"], elem["lat"])
        elif elem["type"] == "way" and "nodes" in elem:
            ways.append(elem)

    records = []
    for way in ways:
        coords = [nodes[str(nid)] for nid in way.get("nodes", []) if str(nid) in nodes]
        if len(coords) < 2:
            continue
        tags = way.get("tags", {})
        records.append(
            {
                "osm_id": way["id"],
                "highway": tags.get("highway", "unknown"),
                "name": tags.get("name", ""),
                "ref": tags.get("ref", ""),
                "geometry": LineString(coords),
            }
        )

    gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")
    if cache_path:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        gdf.to_file(cache_path, driver="GeoJSON")
    return gdf


def fetch_osm_landcover(
    bbox: tuple[float, float, float, float],
    cache_path: Path | None = None,
) -> gpd.GeoDataFrame:
    """Fetch forest and water geometry for the bbox from the Overpass API.

    Returns a GeoDataFrame with a `land_class` column ("forest" or "water"):
    forest = natural=wood/forest/scrub or landuse=forest polygons,
    water  = natural=water polygons and waterway lines.

    For large bboxes (>2° in any dimension), the query is automatically
    split into smaller chunks to avoid Overpass API limits.
    """
    def _landcover_query(bbox_chunk):
        south, west, north, east = bbox_chunk
        return f"""
        [out:json][timeout:60];
        (
          way["natural"~"^(wood|forest|scrub|water)$"]({south},{west},{north},{east});
          way["landuse"="forest"]({south},{west},{north},{east});
          way["waterway"]({south},{west},{north},{east});
        );
        out body;
        >;
        out skel qt;
        """

    data = _fetch_overpass_chunked(_landcover_query, bbox)

    def classify(tags: dict) -> str | None:
        natural = str(tags.get("natural", ""))
        if natural in ("wood", "forest", "scrub") or tags.get("landuse") == "forest":
            return "forest"
        if natural == "water" or "waterway" in tags:
            return "water"
        return None

    records = _ways_to_geometries(data, classify)
    gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")
    if cache_path and not gdf.empty:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        gdf.to_file(cache_path, driver="GeoJSON")


def _metric_crs(gdf: gpd.GeoDataFrame):
    """Pick a local projected CRS (UTM) so distances come out in metres."""
    try:
        return gdf.estimate_utm_crs() or gdf.crs
    except Exception:
        return gdf.crs


def _month_of(date_value) -> int | None:
    s = str(date_value)
    if len(s) >= 7 and s[4] == "-":
        try:
            month = int(s[5:7])
            return month if 1 <= month <= 12 else None
        except ValueError:
            return None
    return None


def compute_road_features(observations: gpd.GeoDataFrame, roads: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Join observations to their nearest road segment and compute per-segment features.

    Every road in `roads` is returned (segments with zero observations are
    the negative class for the model). Segment geometry is the actual OSM
    road LineString in WGS84; the observation-to-segment join and distances
    are computed in a local metric CRS so `distance_to_road_mean` is metres.
    species_mix / season_curve are aggregated from the joined observations
    and are label-adjacent context, never model features.
    """
    if observations.empty or roads.empty:
        return gpd.GeoDataFrame(columns=[], geometry=[], crs="EPSG:4326")

    metric_crs = _metric_crs(roads)
    roads_m = roads.to_crs(metric_crs)
    obs_m = observations.to_crs(metric_crs)

    joined = gpd.sjoin_nearest(obs_m, roads_m, how="left", distance_col="distance_to_road")

    aggregates: Dict[str, dict] = {}
    for osm_id, group in joined.groupby("osm_id"):
        species_mix = Counter(str(v) for v in group.get("taxon_class", []) if pd.notna(v))
        season_curve = [0] * 12
        if "observed_on" in group.columns:
            for d in group["observed_on"]:
                month = _month_of(d)
                if month is not None:
                    season_curve[month - 1] += 1
        aggregates[str(osm_id)] = {
            "observation_count": int(len(group)),
            "species_mix": dict(species_mix),
            "endangered_flag": bool(group.get("endangered_flag", pd.Series([False])).any()),
            "season_curve": season_curve,
            "distance_to_road_mean": (
                float(group["distance_to_road"].mean())
                if "distance_to_road" in group.columns
                else 0.0
            ),
        }

    lengths_km = (roads_m.geometry.length / 1000.0).round(3)

    rows = []
    for pos, road in roads.iterrows():
        key = str(road["osm_id"])
        agg = aggregates.get(key, {})
        rows.append(
            {
                "osm_id": road["osm_id"],
                "observation_count": agg.get("observation_count", 0),
                "species_mix": agg.get("species_mix", {}),
                "endangered_flag": agg.get("endangered_flag", False),
                "season_curve": agg.get("season_curve", [0] * 12),
                "highway": road.get("highway", "unknown"),
                "ref": road.get("ref", ""),
                "name": road.get("name", ""),
                "distance_to_road_mean": agg.get("distance_to_road_mean", 0.0),
                "geometry": road.geometry,
                "road_length_km": float(lengths_km.loc[pos]),
            }
        )

    segments = gpd.GeoDataFrame(rows, crs=roads.crs)
    segments["road_class_score"] = segments["highway"].map(
        lambda h: ROAD_CLASS_SCORES.get(str(h), 0)
    )
    return segments



def compute_environmental_features(
    segments: gpd.GeoDataFrame, landcover: gpd.GeoDataFrame
) -> gpd.GeoDataFrame:
    """Attach forest_share (share of the 500 m corridor buffer covered by
    forest) and water_distance_m (metres to nearest water geometry)."""
    out = segments.copy()
    if out.empty:
        return out

    metric_crs = _metric_crs(out)
    seg_m = out.to_crs(metric_crs)

    forest = None
    water = None
    if landcover is not None and not landcover.empty:
        lc_m = landcover.to_crs(metric_crs)
        forest_geoms = lc_m[lc_m["land_class"] == "forest"].geometry.values
        water_geoms = lc_m[lc_m["land_class"] == "water"].geometry.values
        if len(forest_geoms):
            forest = unary_union(forest_geoms)
        if len(water_geoms):
            water = unary_union(water_geoms)

    buffers = seg_m.buffer(CORRIDOR_BUFFER_M)
    if forest is not None and not buffers.empty:
        out["forest_share"] = (buffers.intersection(forest).area / buffers.area).round(4)
    else:
        out["forest_share"] = 0.0

    if water is not None:
        out["water_distance_m"] = seg_m.geometry.distance(water).round(2)
    else:
        out["water_distance_m"] = NO_WATER_DISTANCE_M

    return out


def add_neighbor_density(
    segments: gpd.GeoDataFrame,
    observations: gpd.GeoDataFrame,
    radius_m: float = NEIGHBOUR_RADIUS_M,
) -> gpd.GeoDataFrame:
    """Spatial-lag feature: observations within `radius_m` of the segment,
    EXCLUDING the segment's own observations.

    This keeps observation pressure in the feature set without leaking the
    segment's own label (its own observation_count) into the model.
    """
    out = segments.copy()
    if out.empty or observations.empty:
        out["neighbor_density"] = 0
        return out

    metric_crs = _metric_crs(out)
    obs_m = observations.to_crs(metric_crs)
    seg_m = out.to_crs(metric_crs)

    own_counts = out["observation_count"] if "observation_count" in out.columns else None
    densities = []
    for idx, geom in seg_m.geometry.items():
        within = int((obs_m.geometry.distance(geom) <= radius_m).sum())
        own = int(own_counts.loc[idx]) if own_counts is not None else 0
        densities.append(max(0, within - own))
    out["neighbor_density"] = densities
    return out


def build_feature_table(observations_path: Path, output_path: Path) -> Dict:
    """End-to-end feature builder: fetch roads + landcover, join, save segments."""
    observations = gpd.read_file(observations_path)
    if observations.empty:
        raise RuntimeError("No observations found at " + str(observations_path))

    minx, miny, maxx, maxy = observations.total_bounds
    bbox = (miny, minx, maxy, maxx)  # south, west, north, east

    roads = fetch_osm_roads(bbox, cache_path=output_path.parent / "osm_roads.geojson")
    landcover = fetch_osm_landcover(bbox, cache_path=output_path.parent / "osm_landcover.geojson")

    segments = compute_road_features(observations, roads)
    segments = compute_environmental_features(segments, landcover)
    segments = add_neighbor_density(segments, observations)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    segments.to_file(output_path, driver="GeoJSON")

    return {
        "segments_path": str(output_path),
        "segment_count": int(len(segments)),
        "observation_count": int(len(observations)),
        "road_count": int(len(roads)),
    }
