"""SafePassage ML Pipeline — Offline Demo / Smoke Test

Creates a synthetic but internally consistent scenario — three highway
corridors, clustered roadkill observations, forest and water layers — and
runs the full pipeline:

    features -> KDE -> model -> metrics -> export -> validate

No external APIs, no network, deterministic (seeded RNG). Exits 1 if any
Schema v1 validation fails, so it can gate commits and deploys.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import LineString, Point, Polygon

# Use local src path when run directly
SRC = Path(__file__).resolve().parent.parent / "ml-pipeline" / "src"
sys.path.insert(0, str(SRC))

from export_geojson import export_hotspots, export_segments, load_schema  # noqa: E402
from features import (  # noqa: E402
    add_neighbor_density,
    compute_environmental_features,
    compute_road_features,
)
from kde import compute_kde_hotspots, recommend_intervention as recommend  # noqa: E402
from metrics import compute_metrics, save_metrics  # noqa: E402
from model import prepare_training_data, score_segments, train_segment_model  # noqa: E402

MONTH_WEIGHTS = [3, 3, 5, 6, 8, 12, 15, 14, 9, 6, 4, 3]  # monsoon-weighted
SPECIES = ["Chital", "Indian peafowl", "Wild boar", "Bonnet macaque", "Indian hare"]
CLASSES = ["Mammalia", "Mammalia", "Aves", "Mammalia", "Mammalia"]


def _corridor(name: str, start, end, n_segments: int) -> list:
    """One highway corridor split into `n_segments` LineStrings."""
    xs = np.linspace(start[0], end[0], n_segments + 1)
    ys = np.linspace(start[1], end[1], n_segments + 1)
    # gentle curve so segments are not perfectly straight
    ys = ys + 0.02 * np.sin(np.linspace(0, np.pi, n_segments + 1))
    rows = []
    for i in range(n_segments):
        rows.append(
            {
                "osm_id": f"{name}-{i:03d}",
                "highway": "trunk",
                "name": name,
                "ref": name,
                "geometry": LineString([(xs[i], ys[i]), (xs[i + 1], ys[i + 1])]),
            }
        )
    return rows


def make_demo_roads() -> gpd.GeoDataFrame:
    rows = []
    # NH-766 (Bandipur corridor): dense observations expected
    rows += _corridor("NH-766", (76.2, 11.5), (76.9, 12.2), 15)
    # NH-48: moderate
    rows += _corridor("NH-48", (77.1, 12.9), (77.8, 13.5), 15)
    # NH-37: none — the negative class
    rows += _corridor("NH-37", (78.4, 14.6), (79.1, 15.2), 15)
    return gpd.GeoDataFrame(rows, crs="EPSG:4326")


def make_demo_landcover() -> gpd.GeoDataFrame:
    """Forest polygons along NH-766, a river crossing it — nothing near NH-37."""
    rows = [
        {"land_class": "forest", "geometry": Polygon([
            (76.30, 11.62), (76.75, 11.58), (76.85, 12.05), (76.35, 12.10)
        ])},
        {"land_class": "forest", "geometry": Polygon([
            (77.15, 13.00), (77.50, 12.98), (77.55, 13.30), (77.18, 13.32)
        ])},
        {"land_class": "water", "geometry": LineString([
            (76.15, 12.30), (76.55, 11.90), (76.95, 11.60)
        ])},
    ]
    return gpd.GeoDataFrame(rows, crs="EPSG:4326")


def make_demo_observations(roads: gpd.GeoDataFrame, n_near: int = 22, n_far: int = 6) -> gpd.GeoDataFrame:
    """Clustered observations along NH-766 (most) and NH-48 (some), none on NH-37."""
    rng = np.random.RandomState(42)
    month_pool = [m + 1 for m, w in enumerate(MONTH_WEIGHTS) for _ in range(w)]

    def cluster(corridor: str, count: int) -> list:
        segs = roads[roads["ref"] == corridor]
        records = []
        for _ in range(count):
            seg = segs.iloc[rng.randint(len(segs))]
            pt = seg.geometry.interpolate(rng.rand(), normalized=True)
            lon, lat = pt.x + rng.normal(0, 0.008), pt.y + rng.normal(0, 0.008)
            species_idx = rng.randint(len(SPECIES))
            records.append(
                {
                    "observation_id": len(records) + len(roads) * 100,
                    "species": SPECIES[species_idx],
                    "taxon_class": CLASSES[species_idx],
                    "observed_on": f"2024-{rng.choice(month_pool):02d}-{rng.randint(1, 29):02d}",
                    "quality_grade": "research",
                    "longitude": float(lon),
                    "latitude": float(lat),
                    "source": "inaturalist",
                    "url": "",
                    "place_id": 6903,
                    "endangered_flag": bool(rng.rand() > 0.8),
                    "nearest_highway": corridor,
                }
            )
        return records

    records = cluster("NH-766", n_near) + cluster("NH-48", n_far)
    return gpd.GeoDataFrame(
        records,
        geometry=gpd.points_from_xy(
            [r["longitude"] for r in records], [r["latitude"] for r in records]
        ),
        crs="EPSG:4326",
    )


def _finalize_segment_properties(scored: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Attach SEG ids (ranked by descending risk) and Schema v1 property names."""
    out = scored.copy()
    out = out.sort_values("risk_score", ascending=False).reset_index(drop=True)
    out["segment_id"] = [f"SEG-{i:06d}" for i in range(len(out))]
    out["highway_name"] = out.get("ref", "unknown")
    out["highway_class"] = out.get("highway", "unknown")
    out["intervention"] = [
        recommend(r, bool(e), int(c))
        for r, e, c in zip(
            out["risk_score"],
            out.get("endangered_flag", pd.Series([False] * len(out))),
            out.get("observation_count", pd.Series([0] * len(out))),
        )
    ]
    return out


def main(output_root: Path = Path("data/processed")) -> int:
    output_root.mkdir(parents=True, exist_ok=True)
    hotspots_schema = Path("data/schema/safepassage.hotspots.v1.json")
    segments_schema = Path("data/schema/safepassage.segments.v1.json")

    print("[1/7] Building demo scenario (roads, landcover, observations)...")
    roads = make_demo_roads()
    landcover = make_demo_landcover()
    observations = make_demo_observations(roads)
    observations.to_file(output_root / "demo_observations.geojson", driver="GeoJSON")
    print(f"  -> {len(roads)} road segments, {len(observations)} observations")

    print("[2/7] Building segment feature table...")
    segments = compute_road_features(observations, roads)
    segments = compute_environmental_features(segments, landcover)
    segments = add_neighbor_density(segments, observations)
    print(f"  -> {len(segments)} segments with features: "
          f"{[c for c in ['road_class_score', 'road_length_km', 'forest_share', 'water_distance_m', 'neighbor_density'] if c in segments.columns]}")

    print("[3/7] Computing KDE hotspots...")
    hotspots = compute_kde_hotspots(observations, bandwidth=0.2)

    print("[4/7] Training calibrated segment model (leakage-safe features)...")
    X, y = prepare_training_data(segments)
    model_info = train_segment_model(X, y)
    print(f"  -> status={model_info['status']} auc={model_info['auc']:.3f} "
          f"calibrated={model_info.get('calibrated')} calibration_error={model_info.get('calibration_error', 0):.3f}")

    print("[5/7] Scoring segments and computing metrics...")
    scored = score_segments(segments, model_info)
    segments_out = _finalize_segment_properties(scored)
    metrics = compute_metrics(segments, model_info)
    save_metrics(metrics, output_root / "demo_stats.json")
    print(f"  -> {len(segments_out)} scored segments (top risk {int(segments_out['risk_score'].max())})")

    print("[6/7] Exporting Schema v1 GeoJSON...")
    hotspots_result = export_hotspots(hotspots, output_root / "demo_hotspots.geojson", hotspots_schema)
    segments_result = export_segments(segments_out, output_root / "demo_segments.geojson", segments_schema)

    print("[7/7] Validation summary")
    ok = True
    for label, result in (("hotspots", hotspots_result), ("segments", segments_result)):
        print(f"  {label}: {result['status']} ({result['feature_count']} features)")
        for err in result["errors"][:5]:
            ok = False
            print(f"    - Feature {err['feature_index']}: {err['error']}")

    if not ok:
        print("VALIDATION FAILED")
        return 1
    print("=== DEMO COMPLETE — all outputs Schema v1 valid ===")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the offline SafePassage demo pipeline")
    parser.add_argument("--out", default="data/processed", help="Output directory")
    args = parser.parse_args()
    sys.exit(main(Path(args.out)))
