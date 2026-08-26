"""SafePassage ML Pipeline — KDE Hotspot Module

Builds kernel-density hotspot maps from observation points.
Outputs a Schema v1-compliant GeoJSON point layer.
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.stats import gaussian_kde


def compute_kde_hotspots(
    observations: gpd.GeoDataFrame,
    bandwidth: float = 0.1,
    n_grid: int = 200,
    min_value: float = 0.0,
    max_value: float = 100.0,
) -> gpd.GeoDataFrame:
    """Compute KDE density at each observation location and return as points.

    For the hackathon, this returns observation points tagged with a
    density value rather than a full raster, which keeps the output
    lightweight and compatible with MapLibre point layers.
    """
    if observations.empty:
        return gpd.GeoDataFrame(columns=[], geometry=[], crs="EPSG:4326")

    coords = np.vstack([observations.geometry.x.values, observations.geometry.y.values])

    try:
        kde = gaussian_kde(coords, bw_method=bandwidth)
        densities = kde(coords)
    except np.linalg.LinAlgError:
        densities = np.ones(len(observations))

    # Normalize to 0-100 scale
    d_min, d_max = densities.min(), densities.max()
    if d_max > d_min:
        scores = ((densities - d_min) / (d_max - d_min)) * (max_value - min_value) + min_value
    else:
        scores = np.full_like(densities, min_value)

    records = []
    for idx, row in observations.iterrows():
        records.append(
            {
                "hotspot_id": f"HS-{idx:06d}",
                "risk_score": float(scores[idx]),
                "confidence": 0.3,  # low confidence due to sparse data
                "species_mix": {"Aves": 1, "Mammalia": 1},  # placeholder; replace with real mix
                "endangered_flag": bool(row.get("endangered_flag", False)),
                "season_curve": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],  # placeholder monthly curve
                "observation_count": 1,
                "nearest_highway": str(row.get("nearest_highway", "unknown")),
                "intervention": "wildlife_crossing",  # placeholder
                "model_version": "v0.1-kde",
            }
        )

    gdf = gpd.GeoDataFrame(records, geometry=observations.geometry.values, crs="EPSG:4326")
    return gdf


def build_kde_layer(
    observations_path: Path,
    output_path: Path,
    bandwidth: float = 0.1,
) -> Dict:
    """Load observations, compute KDE hotspots, save Schema v1 GeoJSON."""
    observations = gpd.read_file(observations_path)
    hotspots = compute_kde_hotspots(observations, bandwidth=bandwidth)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    hotspots.to_file(output_path, driver="GeoJSON")

    return {
        "hotspots_path": str(output_path),
        "hotspot_count": int(len(hotspots)),
        "bandwidth": bandwidth,
    }
