"""ML pipeline tests — run from repo root with:
ml-pipeline/.venv/Scripts/python -m pytest ml-pipeline/tests/
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import pytest
from shapely.geometry import LineString, Point, Polygon

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

from export_geojson import export_hotspots, export_segments  # noqa: E402
from features import (  # noqa: E402
    add_neighbor_density,
    compute_environmental_features,
    compute_road_features,
)
from kde import compute_kde_hotspots, recommend_intervention  # noqa: E402
from model import FEATURE_COLS, calibration_error, prepare_training_data  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def demo_segments():
    """Load the committed pipeline output so tests exercise real artifacts."""
    return gpd.read_file(REPO_ROOT / "data" / "processed" / "demo_segments.geojson")


def _toy_world():
    roads = gpd.GeoDataFrame(
        [
            {"osm_id": "A1", "highway": "trunk", "name": "A", "ref": "NH-A",
             "geometry": LineString([(76.5, 11.6), (76.6, 11.7)])},
            {"osm_id": "B1", "highway": "primary", "name": "B", "ref": "NH-B",
             "geometry": LineString([(77.5, 12.6), (77.6, 12.7)])},
        ],
        crs="EPSG:4326",
    )
    obs = gpd.GeoDataFrame(
        [
            {"observation_id": 1, "species": "Chital", "taxon_class": "Mammalia",
             "observed_on": "2024-07-14", "endangered_flag": True,
             "nearest_highway": "NH-A", "geometry": Point(76.55, 11.65)},
            {"observation_id": 2, "species": "Peafowl", "taxon_class": "Aves",
             "observed_on": "2024-08-02", "endangered_flag": False,
             "nearest_highway": "NH-A", "geometry": Point(76.56, 11.66)},
        ],
        geometry="geometry",
        crs="EPSG:4326",
    )
    landcover = gpd.GeoDataFrame(
        [
            {"land_class": "forest", "geometry": Polygon([
                (76.4, 11.5), (76.7, 11.5), (76.7, 11.8), (76.4, 11.8)
            ])},
            {"land_class": "water", "geometry": LineString([(76.0, 12.5), (77.0, 12.4)])},
        ],
        crs="EPSG:4326",
    )
    return roads, obs, landcover


def test_road_features_include_all_roads_and_line_geometry():
    roads, obs, _ = _toy_world()
    segs = compute_road_features(obs, roads)
    assert len(segs) == 2, "segments without observations must appear as negatives"
    assert set(segs.geometry.geom_type) == {"LineString"}
    counts = dict(zip(segs["osm_id"], segs["observation_count"]))
    assert counts["A1"] == 2 and counts["B1"] == 0


def test_environmental_features_are_physical():
    roads, obs, landcover = _toy_world()
    segs = compute_environmental_features(compute_road_features(obs, roads), landcover)
    a = segs[segs["osm_id"] == "A1"].iloc[0]
    b = segs[segs["osm_id"] == "B1"].iloc[0]
    assert a["forest_share"] > 0.0, "A1 runs through forest"
    assert a["forest_share"] > b["forest_share"]
    assert a["water_distance_m"] > b["water_distance_m"], "B1 is nearer the river"
    assert a["water_distance_m"] > 0.0 and b["water_distance_m"] > 0.0


def test_neighbor_density_excludes_own_observations():
    roads, obs, landcover = _toy_world()
    segs = add_neighbor_density(
        compute_environmental_features(compute_road_features(obs, roads), landcover), obs
    )
    a = segs[segs["osm_id"] == "A1"].iloc[0]
    # A1 owns both observations; within the radius there are only those two
    assert a["neighbor_density"] == 0


def test_prepare_training_data_excludes_label_features(demo_segments):
    X, y = prepare_training_data(demo_segments)
    assert "observation_count" not in X.columns
    assert set(X.columns).issubset(set(FEATURE_COLS))
    assert set(np.unique(y)) == {0, 1}


def test_kde_hotspots_have_real_context():
    _, obs, _ = _toy_world()
    hotspots = compute_kde_hotspots(obs, bandwidth=0.2)
    assert len(hotspots) == 2
    row = hotspots.iloc[0]
    assert row["species_mix"] == {"Mammalia": 1, "Aves": 1}
    assert row["season_curve"] == [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0]
    assert row["observation_count"] == 2


def test_intervention_rules():
    assert recommend_intervention(50, True, 3) == "fencing"
    assert recommend_intervention(80, True, 3) == "wildlife_crossing"
    assert recommend_intervention(80, False, 3) == "wildlife_crossing"
    assert recommend_intervention(50, False, 3) == "signage"
    assert recommend_intervention(20, False, 3) == "speed_limit"
    assert recommend_intervention(90, False, 0) == "none"


def test_calibration_error_bounds():
    y = pd.Series([0, 1, 0, 1])
    assert calibration_error(y, np.array([0.1, 0.9, 0.2, 0.8])) >= 0.0
    # All-0.5 predictions on an imbalanced set are miscalibrated
    y_imbalanced = pd.Series([0, 0, 0, 1])
    assert calibration_error(y_imbalanced, np.array([0.5, 0.5, 0.5, 0.5])) == pytest.approx(0.25)


def test_exported_layers_validate_against_schemas(tmp_path, demo_segments):
    _, obs, _ = _toy_world()
    hotspots = compute_kde_hotspots(obs, bandwidth=0.2)
    hs = export_hotspots(hotspots, tmp_path / "h.geojson",
                         REPO_ROOT / "data" / "schema" / "safepassage.hotspots.v1.json")
    sg = export_segments(demo_segments, tmp_path / "s.geojson",
                         REPO_ROOT / "data" / "schema" / "safepassage.segments.v1.json")
    assert hs["status"] == "valid", hs["errors"][:2]
    assert sg["status"] == "valid", sg["errors"][:2]
