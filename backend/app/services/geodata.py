"""Loads Schema v1 GeoJSON from data/fixtures (or real model output once Day 5 lands)
and applies simple query filters. Kept dependency-free (no geopandas) so the API
container stays tiny — geopandas lives in ml-pipeline only.

Caching strategy:
- Files are cached in memory after first read for performance
- Cache can be invalidated via invalidate() when fixtures are updated
- For Vercel serverless, the cache persists across warm invocations
- For cold starts, files are re-read from disk
"""
import json
from pathlib import Path
from typing import Optional

# backend/app/services/geodata.py -> repo root is 3 parents up
REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURES_DIR = REPO_ROOT / "data" / "fixtures"

_cache: dict = {}
_cache_timestamps: dict = {}  # Track file modification times for staleness detection


def _load(name: str) -> dict:
    """Load a GeoJSON fixture file with caching and staleness detection.

    The cache is invalidated if the file has been modified since the last read.
    This ensures that when fixtures are updated (e.g., after a pipeline run),
    the API serves the new data without requiring a server restart.
    """
    path = FIXTURES_DIR / name

    # Check if file exists and get modification time
    if path.exists():
        try:
            mtime = path.stat().st_mtime
        except OSError:
            mtime = 0

        # Return cached version if file hasn't changed
        if name in _cache and _cache_timestamps.get(name) == mtime:
            return _cache[name]

        # Read and cache the file
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            _cache[name] = data
            _cache_timestamps[name] = mtime
            return data
        except (json.JSONDecodeError, OSError) as e:
            # If the file is corrupted, return empty collection
            # but don't cache the error
            return {"type": "FeatureCollection", "features": []}
    else:
        # File doesn't exist - cache empty result to avoid repeated disk checks
        empty = {"type": "FeatureCollection", "features": []}
        _cache[name] = empty
        _cache_timestamps[name] = 0
        return empty


def invalidate(name: str) -> None:
    """Invalidate the cache for a specific fixture file.

    Call this when:
    - Fixtures are updated by the ML pipeline
    - A new model run completes
    - Manual fixture updates are made

    Example:
        invalidate("hotspots.geojson")
        invalidate("segments.geojson")
    """
    _cache.pop(name, None)
    _cache_timestamps.pop(name, None)


def invalidate_all() -> None:
    """Invalidate all cached fixtures. Useful for development and after pipeline runs."""
    _cache.clear()
    _cache_timestamps.clear()


def load_hotspots() -> dict:
    """Load the hotspots GeoJSON fixture."""
    return _load("hotspots.geojson")


def load_segments() -> dict:
    """Load the segments GeoJSON fixture."""
    return _load("segments.geojson")


def filter_features(
    collection: dict,
    min_score: Optional[int] = None,
    species: Optional[str] = None,
    highway: Optional[str] = None,
    endangered_only: bool = False,
) -> dict:
    """Filter GeoJSON features based on query parameters.

    Args:
        collection: A GeoJSON FeatureCollection
        min_score: Minimum risk_score (0-100) to include
        species: Filter by taxonomic class present in species_mix
        highway: Filter by nearest_highway
        endangered_only: Only return features with endangered_flag=true

    Returns:
        Filtered FeatureCollection with only matching features
    """
    features = collection.get("features", [])

    def keep(feat: dict) -> bool:
        props = feat.get("properties", {})
        if min_score is not None and int(props.get("risk_score", 0)) < min_score:
            return False
        if highway is not None:
            if props.get("nearest_highway", props.get("highway_name")) != highway:
                return False
        if endangered_only and not bool(props.get("endangered_flag", False)):
            return False
        if species is not None:
            mix = props.get("species_mix", {}) or {}
            if not isinstance(mix, dict) or int(mix.get(species, 0)) <= 0:
                return False
        return True

    return {"type": "FeatureCollection", "features": [f for f in features if keep(f)]}
