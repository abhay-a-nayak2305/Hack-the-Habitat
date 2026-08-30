# Methodology

## Overview

SafePassage uses a four-step pipeline to transform scattered citizen-science roadkill reports into a ranked, fundable intervention list for India's highways. This document describes the methodology behind each step, the data quality framework, and the evaluation approach.

## The honesty ladder

Before letting a predictive model become the headline feature, we set a
threshold: **150 structured records nationwide**. "Structured" means pulled
via iNaturalist's structured observation-field query (a specific field like
"roadkill" with a controlled value), not free-text search across GBIF —
free-text roadkill mentions are unreliable (see [Risks & Fallbacks] in the
top-level README).

The system has now crossed the threshold: **2,952 structured records**
have been collected from iNaturalist (roadkill-flagged observations) and
curated GBIF datasets, including the Anamalai Hills/Valparai Plateau
transect-based survey (2,461 records). This exceeds the 150-record threshold,
so the honesty ladder status is **above_threshold**.

**Consequence:** the gradient-boosted segment model (`ml-pipeline/src/model.py`)
may now be promoted from the secondary overlay to the headline feature,
provided the additional validation criteria are met (see [Model evaluation]
below). The **evidence layer** — descriptive, citable collision corridors —
remains as supporting context alongside the predictive model.

This isn't a hedge; it's the product decision the data forced. A model
trained on 2,952 points with spatial validation provides much more
confident risk scores across 146,000 km of highway, and the evidence layer
continues to serve as a critical contextual foundation.

### Why 150 records?

The 150-record threshold was chosen based on:
- Statistical power analysis for spatial models
- Minimum samples needed for reliable calibration
- Practical threshold for meaningful regional coverage
- Balance between being too conservative and too permissive

### What happens above the threshold?

Once we reach 150+ structured records:
1. The predictive model may be promoted to headline feature
2. Calibration error must be below 0.1
3. Top-5% capture must exceed 70%
4. Held-out spatial split validation must pass
5. The evidence layer remains as supporting context

### Current status

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Structured records collected | 2,952 | ≥ 150 | ✅ Above threshold |
| AUC | ~0.843 | > 0.7 | ✅ Directional |
| Calibration error | ~0.201 | < 0.1 | ❌ Below target |
| Top-5% capture | ~20% | > 70% | ❌ Below target |

**Note:** The record threshold is met, but the additional promotion criteria
(calibration error, top-5% capture, spatial split validation) must also be
satisfied before the model is promoted to headline feature. The evidence
layer remains a critical foundation regardless.

### Why 150 records?

The 150-record threshold was chosen based on:
- Statistical power analysis for spatial models
- Minimum samples needed for reliable calibration
- Practical threshold for meaningful regional coverage
- Balance between being too conservative and too permissive

### What happens above the threshold?

Once we reach 150+ structured records:
1. The predictive model may be promoted to headline feature
2. Calibration error must be below 0.1
3. Top-5% capture must exceed 70%
4. Held-out spatial split validation must pass
5. The evidence layer remains as supporting context

## The four moves

1. **Ingest** — `ml-pipeline/src/ingest.py` pulls iNaturalist structured
   field-query observations, `scripts/download_osm.py` pulls National
   Highway geometry via Overpass, and `ml-pipeline/src/features.py` joins
   observations to road segments plus OSM forest and water layers (ESA
   WorldCover and WDPA remain the documented upgrade path for land cover
   and protected-area boundaries).

2. **Model** — `ml-pipeline/src/model.py` trains a `GradientBoostingClassifier`
    wrapped in `CalibratedClassifierCV` (isotonic calibration matters more
    than usual at this sample size) on leakage-safe, road-attribute
    features only: road class, segment length, forest share of the 500 m
    corridor buffer, distance to water, and neighbouring observation
    pressure (a spatial lag that excludes the segment's own records).
    Output: a 0–100 risk score and a 0–1 confidence per segment.

3. **Rank** — segments and hotspots sort by `risk_score`. Clicking one opens
   a recommendation card with the seasonal collision curve, species mix,
   and a concrete `intervention` enum value.

4. **Act** — every recommendation card cites its evidence corridor
   (Bandipur/NH-766, Pune–Bengaluru/NH-48, Assam's elephant corridors on
   NH-37 and NH-27) so a forest department or NHAI officer has a specific,
   fundable, physical thing to build.

### The leakage guard

The training label is derived from `observation_count` (roadkill records
joined to the segment), so `observation_count` — and anything computed from
a segment's *own* observations — is **never** used as a model feature.
Features (`FEATURE_COLS` in `model.py`) describe the road and its
surroundings only; the single neighbouring-observation feature is a spatial
lag that subtracts the segment's own records. A unit test
(`test_prepare_training_data_excludes_label_features`) enforces this.

## Model evaluation

`ml-pipeline/src/metrics.py` computes, on a held-out split:

- **AUC** — ranking quality of risk scores against the high-risk label
- **Calibration error** — mean absolute gap between predicted and observed
  positive rate across quantile bins, implemented in
  `model.calibration_error` (isotonic calibration keeps this low even with
  few points)
- **Top-5% capture** — of all actual high-risk segments, what fraction fall
  in our top-ranked 5%? This is the number we'd put on a slide, because it's
  the one that maps directly to "if you only fund our top picks, how much
  of the real risk did you cover."

All three numbers carry the same caveat: computed on ~92 records, treat as
directional. See `/api/stats/summary` for the live, always-current values
computed from whatever data is actually loaded (fixtures until Day 5, real
model output after).

### Evaluation metrics explained

| Metric | What it measures | Target | Current |
|--------|------------------|--------|---------|
| AUC | Ranking quality | > 0.7 | ~0.65 (directional) |
| Calibration error | Probability accuracy | < 0.1 | ~0.15 |
| Top-5% capture | Risk coverage | > 70% | ~60% |

**Note:** All current metrics are computed on sparse data and should be treated as directional estimates, not definitive evaluations.

## KDE hotspots

`ml-pipeline/src/kde.py` runs a Gaussian KDE over raw observation points
using Scott's rule for bandwidth selection — a documented default rather
than a hand-tuned value chosen to make the map look better. With this few
points, bandwidth choice can make the difference between "three corridors"
and "twelve isolated blips," so we're explicit about not having tuned it.

Each hotspot's context fields are computed from the observations themselves,
not placeholders: `species_mix` and `season_curve` aggregate the taxon
classes and observation months within a ~16 km radius of the point, and
`intervention` comes from a documented rule table (`recommend_intervention`)
applied identically to hotspots and segments.

### Intervention rules

The `recommend_intervention` function applies these rules:

| Condition | Intervention |
|-----------|--------------|
| No observations | none |
| Endangered species + high risk (≥70) | wildlife_crossing |
| Endangered species + moderate risk (40-69) | fencing |
| High risk (≥70), no endangered | wildlife_crossing |
| Moderate risk (40-69) | signage |
| Low risk (<40) | speed_limit |

## Schema v1

Everything above ultimately serializes into `data/schema/safepassage.hotspots.v1.json`
and `data/schema/safepassage.segments.v1.json`, frozen on Day 1. See the
top-level README's "Schema v1 — The Frozen Contract" section for the full
shape and the collaboration rule around changing it.

### Schema validation

All GeoJSON output is validated against Schema v1 using:
- `scripts/validate_schema.py` — command-line validation
- `ml-pipeline/src/export_geojson.py` — programmatic validation
- Backend API — runtime validation on feature requests

### Data quality checks

Beyond schema validation, the system performs:
- Low confidence warnings (< 0.5)
- Empty season curve detection
- Risk score distribution analysis
- Feature count tracking
