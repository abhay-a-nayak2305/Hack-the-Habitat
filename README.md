# SafePassage

**A roadkill hotspot predictor and wildlife-crossing planner for India's highways.**
An open-source project in active development.

> Show us your highway, and we'll tell you where animals will die next — and exactly what to build there to stop it.

---

## Table of Contents

1. [Project Summary](#project-summary)
2. [What This Repo Contains](#what-this-repo-contains)
3. [The Four Moves](#the-four-moves)
4. [Tech Stack](#tech-stack)
5. [Folder Structure](#folder-structure)
6. [Schema v1 — The Frozen Contract](#schema-v1--the-frozen-contract)
7. [Getting Started](#getting-started)
8. [Project Status & Roadmap](#project-status--roadmap)
9. [Collaboration Rules](#collaboration-rules)
10. [Risks & Fallbacks](#risks--fallbacks)
11. [License & Attribution](#license--attribution)

---

## Project Summary

India’s 146,000 km national highway network cuts through tiger reserves, elephant corridors, and the Western Ghats. Most wildlife-vehicle collisions go unreported, and the mitigation money that does flow often goes to politically convenient locations rather than where animals actually die.

SafePassage ingests real roadkill observations, learns where collisions concentrate, and hands forest departments, NHAI, and local panchayats a **ranked shopping list of interventions**: this segment deserves the next crossing, that stretch needs painted signage and a seasonal speed limit, this cluster needs a fence first.

### Stakeholders

| Who | What They Get |
|-----|---------------|
| **Forest departments & NHAI** | Prioritized, cost-ranked intervention list — evidence for budget meetings |
| **Researchers & NGOs** | Baseline mortality maps, seasonal curves, exportable GeoJSON |
| **Citizens & students** | Thirty-second sighting form and a live map of evolving hotspots |
| **Media & public** | Hard numbers for debates like Bandipur/NH-766 |

---

## What This Repo Contains

This is a **monorepo** holding every SafePassage artifact:

- **`frontend/`** — React + Vite + Tailwind + MapLibre web app
- **`backend/`** — FastAPI service serving Schema v1 GeoJSON + sightings POST
- **`ml-pipeline/`** — Data ingestion, feature engineering, KDE hotspots, GradientBoosting model
- **`data/`** — Frozen Schema v1, fixture GeoJSON, raw and processed datasets
- **`docs/`** — Methodology, attribution, and design documents
- **`scripts/`** — One-off helpers for data downloads, schema validation, deployment
- **`.github/`** — CI workflows and issue templates

---

## The Four Moves

The entire product is a linear pipeline, not four separate features:

| Move | What It Does | Plain-Language Result |
|------|-------------|----------------------|
| **Ingest** | Pulls roadkill records from iNaturalist structured field query, joins OpenStreetMap road geometry plus OSM forest and water layers via Overpass (ESA WorldCover + WDPA are the documented upgrade path) | A clean, citable dataset tied to road segments |
| **Model** | Calibrated gradient-boosted model scores every road segment 0–100 on leakage-safe road-attribute features: road class, forest cover, distance to water, and neighbouring observation pressure | A confidence score for each segment — explicitly low-confidence because training data is sparse (92 records nationwide) |
| **Rank** | Segments sorted 0–100; clicking a red segment opens a **recommendation card** — seasonal collision curves, species mix, and an explicit intervention type | A prioritized list: “Segment NH-766-KM12 scores 87/100; build a crossing + fence here.” |
| **Act** | Recommendation card cites the evidence corridor (Bandipur/NH-766, Pune–Bengaluru, Assam elephant corridors) so forest departments can immediately budget and build | Decision-ready output: a ranked, justified intervention plan |

**Important:** Because the Day-1 honesty ladder returned only 92 structured iNaturalist records (under the 150-record threshold), the **predictive hotspot model is demoted from headline feature to a secondary, clearly-labeled, low-confidence layer**. The **evidence layer** — descriptive, citable collision corridors sourced from literature and news — is the headline feature.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | React 18 + Vite + Tailwind CSS + MapLibre GL JS | Fastest scaffold-to-deploy; MapLibre is open-source, no billing surprise |
| **Backend** | FastAPI + static GeoJSON tiles + Supabase free tier | Minimal backend; survives traffic spikes; real database in minutes |
| **ML / Data** | Python, geopandas, SciPy KDE, scikit-learn GradientBoosting | Battle-tested spatial stack; handles messy tabular features |
| **Hosting** | Vercel (frontend + API), GitHub (repo) | Always-live deployment; every push is reviewable |
| **Practices** | Frozen Schema v1, fixture-first UI, weekly sync | Coordination protocol that scales beyond the founding team |

---

## Folder Structure

```
hack-the-habitat/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map.jsx
│   │   │   ├── HotspotLayer.jsx
│   │   │   ├── RecommendationCard.jsx
│   │   │   ├── SeasonalityCalendar.jsx
│   │   │   ├── SpeciesFilter.jsx
│   │   │   ├── ReportSightingForm.jsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── MapPage.jsx
│   │   │   ├── MethodologyPage.jsx
│   │   │   ├── AttributionPage.jsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── vercel.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── hotspots.py
│   │   │   ├── segments.py
│   │   │   ├── stats.py
│   │   │   └── sightings.py
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   ├── tests/
│   ├── requirements.txt
│   └── vercel.json
│
├── ml-pipeline/
│   ├── notebooks/
│   │   ├── 01_ingest_inaturalist.ipynb
│   │   ├── 02_feature_engineering.ipynb
│   │   ├── 03_kde_hotspots.ipynb
│   │   └── 04_segment_model.ipynb
│   ├── src/
│   │   ├── ingest.py
│   │   ├── features.py
│   │   ├── kde.py
│   │   ├── model.py
│   │   ├── metrics.py
│   │   └── export_geojson.py
│   ├── data/
│   │   ├── raw/
│   │   └── processed/
│   ├── requirements.txt
│   └── README.md
│
├── data/
│   ├── schema/
│   │   └── safepassage.hotspots.v1.json      # FROZEN — do not change after Day 1
│   ├── fixtures/
│   │   ├── hotspots.geojson                  # Fixture data for frontend dev
│   │   │   └── segments.geojson                   # Fixture data for frontend dev
│   ├── raw/                                   # Raw downloads, gitignored
│   └── processed/                             # Cleaned/joined datasets, gitignored
│
├── docs/
│   ├── methodology.md
│   ├── attribution.md
│   ├── project-overview.md
│   └── demo-script.md
│
├── scripts/
│   ├── validate_schema.py                     # Validates GeoJSON against Schema v1
│   ├── download_inaturalist.py
│   ├── download_osm.py
│   └── deploy.sh
│
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   └── ISSUE_TEMPLATE/
│       └── bug_report.md
│
├── SAFEPSSAGE_ROADMAP.md
├── SafePassage-Project-Brief-v1.1.pdf
├── package.json
├── vercel.json
├── .gitignore
└── README.md
```

### Who Works on What

| Role | Primary Folders | Also Touches |
|------|----------------|--------------|
| **ML Engineer** | `ml-pipeline/`, `data/raw/`, `data/processed/`, `data/schema/`, `scripts/` | `docs/methodology.md`, `docs/attribution.md`, backend routers |
| **Fullstack Dev** | `frontend/`, `backend/`, `data/fixtures/`, `scripts/` | `docs/demo-script.md`, `.github/workflows/` |

#### ML Engineer — Your Territory

You own the data and the model. Everything from raw ingestion to ranked output flows through your work:

- **`ml-pipeline/src/ingest.py`** — iNaturalist structured-field query, deduplication, GBIF cross-check
- **`ml-pipeline/src/features.py`** — OSM road join, ESA WorldCover, WDPA protected-area features
- **`ml-pipeline/src/kde.py`** — kernel-density hotspot maps from the 92 observation points
- **`ml-pipeline/src/model.py`** — GradientBoosting segment scoring, confidence calibration
- **`ml-pipeline/src/metrics.py`** — AUC, calibration, top-5% capture stat for the methodology page
- **`ml-pipeline/src/export_geojson.py`** — exports Schema v1-compliant GeoJSON for the frontend/backend
- **`ml-pipeline/notebooks/`** — exploratory analysis, honesty-ladder checks, Rung 2 state pooling
- **`data/raw/`** — downloaded CSVs, API responses, gitignored
- **`data/processed/`** — cleaned datasets, joined features, gitignored
- **`data/schema/safepassage.hotspots.v1.json`** — frozen contract; you must validate all output against it
- **`scripts/download_inaturalist.py`**, **`scripts/download_osm.py`** — one-off data fetchers
- **`scripts/validate_schema.py`** — run this on every data commit

**Your deliverables:**
1. Day 1: honesty-ladder check documented in `docs/methodology.md`
2. Day 2-3: KDE hotspots and segment model trained
3. Day 4: metrics JSON (`/api/stats/summary` payload) computed
4. Day 5: Schema v1 GeoJSON exported and handed to fullstack dev

#### Fullstack Dev — Your Territory

You own the product. The map, the cards, the form, the API, and the deploy:

- **`frontend/src/components/`** — MapLibre map, hotspot layer, recommendation cards, seasonality calendar, species filters, report-a-sighting form
- **`frontend/src/pages/`** — MapPage, MethodologyPage, AttributionPage
- **`frontend/src/hooks/`** — data fetching, map state, filters
- **`frontend/src/utils/`** — helpers for GeoJSON parsing, formatting
- **`frontend/src/styles/`** — Tailwind directives, custom CSS
- **`frontend/vercel.json`** — deploy config
- **`backend/app/routers/hotspots.py`** — serves filtered GeoJSON to the map
- **`backend/app/routers/segments.py`** — full segment dossier endpoint
- **`backend/app/routers/stats.py`** — headline metrics for methodology page
- **`backend/app/routers/sightings.py`** — POST endpoint for report-a-sighting form
- **`backend/app/main.py`** — FastAPI app entrypoint
- **`data/fixtures/`** — committed fixture GeoJSON for frontend dev before real data lands
- **`scripts/validate_schema.py`** — run this on every fixture/model data commit
- **`.github/workflows/ci.yml`** — CI for linting, schema validation, deploy preview
- **`docs/project-overview.md`** — project writeup, demo script, screenshots

**Your deliverables:**
1. Map UI loading fixtures and deployed to Vercel
2. Recommendation cards, seasonality, species filters, report form
3. Methodology and attribution pages
4. FastAPI wired to real predictions, sightings form persisted
5. Ongoing polish: accessibility, mobile, documentation

### Shared Responsibilities

Both roles touch these:

| Artifact | Why Both Touch It |
|----------|------------------|
| **`data/schema/safepassage.hotspots.v1.json`** | ML validates output against it; frontend/backend validate input against it |
| **`data/fixtures/`** | ML may update fixtures when model improves; frontend consumes them |
| **`scripts/validate_schema.py`** | Both run it before committing data or fixtures |
| **`docs/methodology.md`** | ML writes model metrics; fullstack writes methodology page content |
| **Evening sync at 21:30** | Both leads present; contract changes require both signatures |

---

## Schema v1 — The Frozen Contract

**File:** `data/schema/safepassage.hotspots.v1.json`

This schema is **frozen on Day 1 at 10:00 AM** and never touched again. Both the ML pipeline and the frontend build against this contract. Any change requires a coordinated v2 bump and re-freeze.

### Hotspot Feature Shape

```jsonc
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [76.42, 11.67]  // [longitude, latitude] WGS84
  },
  "properties": {
    "hotspot_id": "HS-000123",
    "risk_score": 87,            // 0–100
    "confidence": 0.82,          // 0–1, model-reported
    "species_mix": { "Aves": 12, "Mammalia": 4 },
    "endangered_flag": true,
    "season_curve": [3,2,2,4,6,9,12,10,7,5,3,2], // Jan–Dec
    "observation_count": 18,
    "nearest_highway": "NH-766",
    "intervention": "wildlife_crossing", // enum: wildlife_crossing | fencing | signage | speed_limit | none
    "model_version": "v0.3"
  }
}
```

### Segments Layer

A parallel `segments.v1` GeoJSON layer carries OSM way IDs and per-segment scores. Same contract rule applies.

### Validation

Run `scripts/validate_schema.py` on every data commit to ensure nothing breaks the contract.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.11
- Git
- Vercel CLI (optional, for deployment)
- Supabase account (free tier)

### Clone

```bash
git clone <repo-url>
cd hack-the-habitat
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### ML Pipeline

```bash
cd ml-pipeline
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
jupyter notebook
```

---

## Project Status & Roadmap

SafePassage is an ongoing open-source project, not a one-off prototype. The core
pipeline — ingestion, risk scoring, hotspot ranking, and the intervention map — is
live; work now focuses on growing data coverage and hardening the model.

| Area | Status | Next Steps |
|------|--------|------------|
| **Data ingestion** | Working (iNaturalist structured query + OSM via Overpass) | Broaden corridor coverage beyond the four pilot highways |
| **Model** | v0.3, low-confidence by design (92 structured records vs. the 150-record honesty bar) | Collect more citizen-science reports; promote the predictive layer once the threshold is met |
| **Backend** | FastAPI serving Schema v1 GeoJSON + sightings POST | Add record-level provenance and pagination |
| **Frontend** | React + MapLibre map, dossier cards, honesty-ladder dashboard, dark & light themes | Mobile UX polish, offline PWA support |
| **Community** | Contribution guide in place | Onboard field volunteers and NGO partners |

**Weekly sync:** every week, 15-minute standup.
**Iron rule:** Nobody changes the contract alone.

---

## Collaboration Rules

1. **Schema v1 is the constitution.** Any change after Day 1 freeze requires both leads to agree in writing in the commit message.
2. **Fixture-first development.** Frontend builds against committed fixture GeoJSON from hour one. ML pipeline outputs real data on Day 5.
3. **Honesty ladder commits.** Every data-quality decision is documented in `docs/methodology.md` with the record count, spatial coverage, and confidence designation.
4. **Cut list is a treaty.** User accounts, native mobile apps, multi-country expansion, and real-time streaming are out of scope for the current release.
5. **Zero paid services.** Everything runs on free tiers and open data. No API keys, no billing surprises.

---

## Risks & Fallbacks

| Risk | Status | Fallback |
|------|--------|----------|
| India data too sparse | **Confirmed** (92 structured records) | Evidence layer is headline; model is secondary low-confidence layer |
| GBIF free-text unreliability | **Confirmed** | Use iNaturalist structured field query exclusively |
| MapLibre styling time-sink | Pending | Timebox 4 hours; fallback to Leaflet + heatmap plugin |
| Integration drift | Pending | Frozen schema + committed fixtures + validation script on every commit |
| Scope creep | Pending | Cut list on page 4 is a treaty; new ideas go to roadmap |
| Supabase friction | Pending | Fallback: embedded Google Form for sightings |

---

## License & Attribution

This project uses open data and open-source software. Full attribution is maintained in `docs/attribution.md` and the in-app attribution page.

| Source | Role | License |
|--------|------|---------|
| **iNaturalist** | Roadkill-flagged observations (structured field query) | CC0 / CC-BY per dataset |
| **GBIF** | Secondary cross-check only | CC0 / CC-BY |
| **OpenStreetMap** | Road geometry via Overpass API | ODbL |
| **ESA WorldCover** | 10 m land cover | CC-BY 4.0 |
| **WDPA** | Protected-area boundaries | Standard terms — registered use, credited |

---

## Why This Project

SafePassage is built around five commitments that guide every design decision:

| Commitment | What It Means in Practice |
|-----------|---------------------------|
| **Environmental Impact** | Ranked intervention list converts death data into prevented deaths — anchored on Bandipur/NH-766 |
| **Use of Technology** | Real spatial statistics + gradient boosting on messy citizen-science data |
| **Design & Usability** | A ten-second understanding path; accessibility treated as a requirement |
| **Sustained Execution** | Deployed from the start; integration treated as a non-event, not a scramble |
| **Output as Protection** | Every recommendation maps to a physical, fundable, life-saving measure |

---

## The Anchor Story

The night-traffic ban on NH-766 through Bandipur Tiger Reserve — upheld by the Supreme Court in 2019 — ignited a running Kerala–Karnataka dispute: traders lose seven night-hours of highway, conservationists cannot prove which stretches actually kill. Both sides argue blind.

SafePassage outputs the evidence layer that debate is missing — for policymakers, researchers, and citizens alike.

---

*Maintained by the SafePassage team — open data, one frozen contract, and a map that tells the truth.*  
**An ongoing open-source project**
