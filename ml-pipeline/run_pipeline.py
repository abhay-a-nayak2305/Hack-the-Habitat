"""Run the full SafePassage ML pipeline end-to-end.

Steps:
1. Ingest (iNaturalist + GBIF)
2. Feature engineering (OSM roads + environmental layers)
3. KDE hotspot computation
4. Model training
5. Export fixtures to data/fixtures/
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))


def run():
    from ingest import run_ingestion
    from features import build_feature_table
    from kde import build_kde_layer
    from model import prepare_training_data, train_segment_model, score_segments
    from metrics import build_metrics_from_segments
    from export_geojson import export_all

    REPO_ROOT = Path(__file__).parent.parent
    PROCESSED_DIR = REPO_ROOT / "data" / "processed"
    FIXTURES_DIR = REPO_ROOT / "data" / "fixtures"
    SCHEMA_PATH = REPO_ROOT / "data" / "schema_v1.json"

    print("=" * 60)
    print("SafePassage ML Pipeline — Full Run")
    print("=" * 60)

    # Step 1: Ingest
    print("\n[1/5] Ingesting data...")
    t0 = time.time()
    ingest_result = run_ingestion(PROCESSED_DIR)
    print(f"  Done in {time.time() - t0:.1f}s")
    print(f"  Total records: {ingest_result['summary']['total_records']}")

    # Use merged observations for downstream steps
    merged_path = Path(ingest_result["merged_path"])
    if not merged_path.exists():
        # Fall back to GBIF-only if merge failed
        merged_path = Path(ingest_result["gbif_path"])
    print(f"  Using: {merged_path}")

    # Step 2: Feature engineering
    print("\n[2/5] Building feature table (OSM roads + environmental layers)...")
    t0 = time.time()
    segments_path = PROCESSED_DIR / "segments.geojson"
    feat_result = build_feature_table(merged_path, segments_path)
    print(f"  Done in {time.time() - t0:.1f}s")
    print(f"  Segments: {feat_result['segment_count']}, Roads: {feat_result['road_count']}")

    # Step 3: KDE hotspots
    print("\n[3/5] Computing KDE hotspots...")
    t0 = time.time()
    hotspots_path = PROCESSED_DIR / "hotspots.geojson"
    kde_result = build_kde_layer(merged_path, hotspots_path)
    print(f"  Done in {time.time() - t0:.1f}s")
    print(f"  Hotspots: {kde_result['hotspot_count']}")

    # Step 4: Model training
    print("\n[4/5] Training segment risk model...")
    t0 = time.time()
    import geopandas as gpd
    segments = gpd.read_file(segments_path)
    X, y = prepare_training_data(segments)
    model_info = train_segment_model(X, y)
    print(f"  Done in {time.time() - t0:.1f}s")
    print(f"  AUC: {model_info['auc']:.4f}, Status: {model_info['status']}")

    # Score segments
    segments = score_segments(segments, model_info)
    segments.to_file(segments_path, driver="GeoJSON")

    # Build metrics
    metrics_path = PROCESSED_DIR / "demo_stats.json"
    metrics_result = build_metrics_from_segments(segments_path, model_info, metrics_path)
    print(f"  Metrics saved to {metrics_path}")

    # Step 5: Export to fixtures
    print("\n[5/5] Exporting to fixtures...")
    t0 = time.time()
    hotspots = gpd.read_file(hotspots_path)
    segments = gpd.read_file(segments_path)

    if SCHEMA_PATH.exists():
        export_result = export_all(hotspots, segments, FIXTURES_DIR, SCHEMA_PATH)
        print(f"  Done in {time.time() - t0:.1f}s")
        print(f"  Validation: {export_result['summary']['status']}")
        print(f"  Hotspots: {export_result['summary']['hotspot_count']}")
        print(f"  Segments: {export_result['summary']['segment_count']}")
    else:
        # No schema — just copy files
        import shutil
        FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy2(hotspots_path, FIXTURES_DIR / "hotspots.geojson")
        shutil.copy2(segments_path, FIXTURES_DIR / "segments.geojson")
        print(f"  Copied to {FIXTURES_DIR} (no schema validation)")

    print("\n" + "=" * 60)
    print("Pipeline complete!")
    print(f"  Records ingested: {ingest_result['summary']['total_records']}")
    print(f"  Hotspots: {len(hotspots)}")
    print(f"  Segments: {len(segments)}")
    print(f"  Model AUC: {model_info['auc']:.4f}")
    print("=" * 60)


if __name__ == "__main__":
    run()
