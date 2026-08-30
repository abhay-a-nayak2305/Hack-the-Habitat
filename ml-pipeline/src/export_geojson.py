"""SafePassage ML Pipeline — GeoJSON Exporter Module

Exports model outputs as Schema v1-compliant GeoJSON files
for the frontend and backend to consume.

This module handles type coercion (numpy/pandas → JSON-safe Python),
geometry conversion, and schema validation to ensure the frozen
contract is never violated.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

import geopandas as gpd
import jsonschema
import numpy as np
import pandas as pd


def _to_native(value):
    """Convert numpy/pandas/GeoJSON-incompatible types to plain Python types."""
    if isinstance(value, (np.integer, np.int64, np.int32)):
        return int(value)
    if isinstance(value, (np.floating, np.float64, np.float32)):
        return float(value)
    if isinstance(value, np.ndarray):
        return [int(v) if np.issubdtype(value.dtype, np.integer) else float(v) for v in value.tolist()]
    if isinstance(value, dict):
        return {str(k): _to_native(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_native(v) for v in value]
    if pd.isna(value):
        return None
    return value


def _coerce_schema_properties(df: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Coerce DataFrame columns to Schema v1-safe Python types."""
    df = df.copy()
    for col in df.columns:
        if col == "geometry":
            continue
        df[col] = df[col].apply(_to_native)

    if "risk_score" in df.columns:
        df["risk_score"] = pd.to_numeric(df["risk_score"], errors="coerce").fillna(0).clip(0, 100).astype(int)

    if "confidence" in df.columns:
        df["confidence"] = pd.to_numeric(df["confidence"], errors="coerce").fillna(0).clip(0.0, 1.0).astype(float)

    if "season_curve" in df.columns:
        df["season_curve"] = df["season_curve"].apply(lambda v: [int(x) for x in _to_native(v)] if v is not None else [0] * 12)

    if "observation_count" in df.columns:
        df["observation_count"] = pd.to_numeric(df["observation_count"], errors="coerce").fillna(0).astype(int)

    if "endangered_flag" in df.columns:
        df["endangered_flag"] = df["endangered_flag"].apply(lambda v: bool(v) if v is not None else False)

    return df


def _geometry_to_geojson_geometry(geom) -> Dict:
    """Convert a Shapely geometry to a GeoJSON geometry dict with list coordinates."""
    geo = geom.__geo_interface__
    if geo.get("type") == "Point":
        coords = geo.get("coordinates", [])
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            geo = {"type": "Point", "coordinates": [float(coords[0]), float(coords[1])]}
    elif geo.get("type") == "LineString":
        coords = geo.get("coordinates", [])
        if isinstance(coords, (list, tuple)):
            geo = {"type": "LineString", "coordinates": [[float(x), float(y)] for x, y in coords]}
    elif geo.get("type") == "MultiPoint":
        coords = geo.get("coordinates", [])
        if isinstance(coords, (list, tuple)):
            geo = {"type": "MultiPoint", "coordinates": [[float(x), float(y)] for x, y in coords]}
    return geo


def load_schema(schema_path: Path) -> Dict:
    """Load the frozen Schema v1 JSON schema."""
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")
    return json.loads(schema_path.read_text())


def validate_feature(feature: Dict, schema: Dict) -> None:
    """Validate a single GeoJSON feature against Schema v1."""
    jsonschema.validate(instance=feature, schema=schema)


def validate_geojson(geojson_path: Path, schema_path: Path) -> Dict:
    """Validate a GeoJSON file against Schema v1 and return results.

    Returns a dictionary with:
    - path: the validated file path
    - status: "valid", "invalid", or "empty"
    - errors: list of validation errors (empty if valid)
    - feature_count: number of features in the file
    - warnings: list of non-fatal warnings (e.g., low confidence)
    """
    schema = load_schema(schema_path)
    gdf = gpd.read_file(geojson_path)

    if gdf.empty:
        return {"path": str(geojson_path), "status": "empty", "errors": [], "warnings": [], "feature_count": 0}

    errors = []
    warnings = []
    for idx, row in gdf.iterrows():
        properties = {k: _to_native(row[k]) for k in row.keys() if k != "geometry"}
        feature = {
            "type": "Feature",
            "geometry": _geometry_to_geojson_geometry(row.geometry),
            "properties": properties,
        }
        try:
            validate_feature(feature, schema)
            # Check for non-fatal warnings
            conf = properties.get("confidence", 1.0)
            if conf < 0.5:
                warnings.append({
                    "feature_index": int(idx),
                    "feature_id": properties.get("hotspot_id") or properties.get("segment_id"),
                    "warning": f"Low confidence: {conf:.2f} (< 0.5 threshold)",
                })
        except jsonschema.ValidationError as exc:
            errors.append({"feature_index": int(idx), "error": str(exc)})

    status = "valid" if not errors else "invalid"
    return {
        "path": str(geojson_path),
        "status": status,
        "errors": errors,
        "warnings": warnings,
        "feature_count": int(len(gdf)),
    }


def _write_schema_geojson(df: gpd.GeoDataFrame, output_path: Path) -> None:
    """Write GeoJSON with strict array coordinates to satisfy Schema v1."""
    features = []
    for _, row in df.iterrows():
        features.append({
            "type": "Feature",
            "geometry": _geometry_to_geojson_geometry(row.geometry),
            "properties": {k: _to_native(row[k]) for k in row.keys() if k != "geometry"},
        })
    fc = {"type": "FeatureCollection", "features": features}
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(fc, indent=2))


def export_hotspots(
    hotspots: gpd.GeoDataFrame,
    output_path: Path,
    schema_path: Path,
) -> Dict:
    """Export hotspots GeoJSON and validate against Schema v1."""
    hotspots = _coerce_schema_properties(hotspots)
    _write_schema_geojson(hotspots, output_path)
    validation = validate_geojson(output_path, schema_path)
    return validation


def export_segments(
    segments: gpd.GeoDataFrame,
    output_path: Path,
    schema_path: Path,
) -> Dict:
    """Export segments GeoJSON and validate against Schema v1."""
    segments = _coerce_schema_properties(segments)
    _write_schema_geojson(segments, output_path)
    validation = validate_geojson(output_path, schema_path)
    return validation


def export_all(
    hotspots: gpd.GeoDataFrame,
    segments: gpd.GeoDataFrame,
    output_dir: Path,
    schema_path: Path,
) -> Dict:
    """Export both hotspots and segments, run validation.

    Returns a dictionary with:
    - hotspots: validation result for hotspots layer
    - segments: validation result for segments layer
    - paths: output file paths
    - summary: overall validation summary
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    hotspots_path = output_dir / "hotspots.geojson"
    segments_path = output_dir / "segments.geojson"

    hotspots_result = export_hotspots(hotspots, hotspots_path, schema_path)
    segments_result = export_segments(segments, segments_path, schema_path)

    # Overall summary
    total_errors = len(hotspots_result.get("errors", [])) + len(segments_result.get("errors", []))
    total_warnings = len(hotspots_result.get("warnings", [])) + len(segments_result.get("warnings", []))

    return {
        "hotspots": hotspots_result,
        "segments": segments_result,
        "hotspots_path": str(hotspots_path),
        "segments_path": str(segments_path),
        "summary": {
            "status": "valid" if total_errors == 0 else "invalid",
            "total_errors": total_errors,
            "total_warnings": total_warnings,
            "hotspot_count": hotspots_result.get("feature_count", 0),
            "segment_count": segments_result.get("feature_count", 0),
        },
    }
