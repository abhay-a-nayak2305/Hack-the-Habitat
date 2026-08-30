# SafePassage ML Pipeline

Turns raw roadkill observations into Schema v1 hotspots and scored road
segments. Everything runs offline against committed data via the demo
pipeline — no network needed for development or verification.

## Setup

```bash
py -V:Astral/CPython3.11.16 -m venv .venv      # or: python -m venv .venv
.venv\Scripts\activate                         # source .venv/bin/activate on bash
pip install -r requirements.txt -r requirements-dev.txt  # dev adds pytest
```

## Run the full pipeline offline

```bash
# From the repo root — creates roads, landcover and observations, then runs
# features -> KDE -> model -> metrics -> export -> validate. Exits 1 on any
# Schema v1 validation failure.
python scripts/demo_pipeline.py

# Validate any GeoJSON against the frozen schemas (auto-detects hotspots
# vs segments by geometry type)
python scripts/validate_schema.py data/fixtures/*.geojson

# Push the validated outputs to the locations the API and frontend serve
copy data\processed\demo_hotspots.geojson data\fixtures\hotspots.geojson
copy data\processed\demo_segments.geojson data\fixtures\segments.geojson
cd ../frontend && npm run sync-fixtures
```

## Tests

```bash
.venv\Scripts\python -m pytest ml-pipeline\tests\ -v
```

The suite covers: segments-without-observations appearing as negatives,
physical plausibility of environmental features, the neighbour-density
spatial lag, the leakage guard on training features, KDE context fields,
intervention rules, calibration-error bounds, and end-to-end schema
validation of exported layers.

## Module map

| Module | Responsibility |
|---|---|
| `src/ingest.py` | iNaturalist structured roadkill query + GBIF cross-check |
| `src/features.py` | OSM roads + forest/water layers, per-segment feature table |
| `src/kde.py` | KDE hotspot points with real species/season context |
| `src/model.py` | Calibrated GBM, leakage-safe features, AUC/top-5%/calibration error |
| `src/metrics.py` | Headline metrics + honesty-ladder summary JSON |
| `src/export_geojson.py` | Schema v1 serialization + jsonschema validation |

## Modelling notes

- **Leakage guard:** the label comes from `observation_count`, so a
  segment's own observations never enter its features (`FEATURE_COLS`).
- **Calibration:** `CalibratedClassifierCV(method="isotonic", cv=3)` when
  the split has enough of both classes; graceful fallback to a plain GBM.
- **Confidence:** reported as `low` throughout — 92 nationwide records is
  far below the 150-record honesty-ladder threshold.