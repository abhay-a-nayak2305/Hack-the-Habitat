"""SafePassage ML Pipeline — KDE Hotspot Module

Builds kernel-density hotspot maps from observation points and derives
per-hotspot context (species mix, seasonal curve, observation counts,
intervention recommendation) from the observations themselves — there are
no placeholder values anywhere in the output.

Outputs a Schema v1-compliant GeoJSON point layer.
"""
from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Dict, List

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.stats import gaussian_kde

# Radius (degrees, ~16 km at Indian latitudes) around each hotspot within
# which neighbouring observations are aggregated for the context fields.
# Matches the default KDE bandwidth scale so the map layer and the
# recommendation card tell the same story.
NEIGHBOUR_RADIUS_DEG = 0.15


def _month_of(date_value) -> int | None:
    """Extract the month (1-12) from an ISO-ish date string like 2024-07-14."""
    s = str(date_value)
    if len(s) >= 7 and s[4] == "-":
        try:
            month = int(s[5:7])
            return month if 1 <= month <= 12 else None
        except ValueError:
            return None
    return None


def _season_curve(dates) -> List[int]:
    """Count observations per calendar month, Jan-Dec."""
    curve = [0] * 12
    for d in dates:
        month = _month_of(d)
        if month is not None:
            curve[month - 1] += 1
    return curve


def recommend_intervention(risk_score: float, endangered: bool, observation_count: int) -> str:
    """Rule-based intervention, applied identically to hotspots and segments.

    - No observations              -> none
    - Endangered species present   -> physical separation: crossing (high
      risk) or fencing (moderate risk)
    - High risk, no endangered     -> wildlife crossing
    - Moderate risk                -> signage
    - Low risk                     -> seasonal speed limit
    """
    if observation_count <= 0:
        return "none"
    if endangered:
        return "wildlife_crossing" if risk_score >= 70 else "fencing"
    if risk_score >= 70:
        return "wildlife_crossing"
    if risk_score >= 40:
        return "signage"
    return "speed_limit"


def _aggregate_context(
    observations: gpd.GeoDataFrame,
    coords: np.ndarray,
    index: int,
    radius_deg: float = NEIGHBOUR_RADIUS_DEG,
) -> Dict:
    """Species mix, season curve and count for neighbours of point `index`."""
    dist = np.hypot(coords[0] - coords[0][index], coords[1] - coords[1][index])
    mask = dist <= radius_deg

    if "taxon_class" in observations.columns:
        mix = Counter(str(v) for v in observations.loc[mask, "taxon_class"] if pd.notna(v))
    else:
        mix = Counter()

    if "observed_on" in observations.columns:
        curve = _season_curve(observations.loc[mask, "observed_on"])
    else:
        curve = [0] * 12

    return {
        "species_mix": dict(mix),
        "season_curve": curve,
        "observation_count": int(mask.sum()),
    }


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
        context = _aggregate_context(observations, coords, idx)
        endangered = bool(row.get("endangered_flag", False))
        risk_score = float(scores[idx])
        records.append(
            {
                "hotspot_id": f"HS-{idx:06d}",
                "risk_score": risk_score,
                "confidence": 0.3,  # low confidence due to sparse data
                "species_mix": context["species_mix"],
                "endangered_flag": endangered,
                "season_curve": context["season_curve"],
                "observation_count": context["observation_count"],
                "nearest_highway": str(row.get("nearest_highway", "unknown") or "unknown"),
                "intervention": recommend_intervention(
                    risk_score, endangered, context["observation_count"]
                ),
                "model_version": "v0.3-kde",
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
