<div align="center">

# 🦌 SafePassage

### Open-Source Wildlife Corridor Intelligence for India's Highways

**Show us your highway, and we'll tell you where animals will die next — and exactly what to build there to stop it.**

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9C%93-82B366)]()
[![Zero Paid Services](https://img.shields.io/badge/Services-Zero%20Cost-4CAF50)]()

---

**[Live Frontend](https://safepassage-nine.vercel.app/)** · **[Backend API](https://safepassage-api.onrender.com/)** · **[API Docs](https://safepassage-api.onrender.com/docs)**

---

</div>

## The Problem

India's **146,000 km** national highway network cuts through tiger reserves, elephant corridors, and the Western Ghats. Most wildlife-vehicle collisions go unreported, and the mitigation money that does flow often goes to politically convenient locations — **not where animals actually die**.

The Supreme Court's night-traffic ban on NH-766 through Bandipur Tiger Reserve was argued blind — neither side could prove which stretches actually kill. **SafePassage ends that blindness.**

---

## What SafePassage Does

| Step | What Happens | Output |
|------|-------------|--------|
| **Ingest** | Pulls roadkill records from iNaturalist, joins OpenStreetMap road geometry + forest & water layers | Clean, citable dataset tied to road segments |
| **Model** | Calibrated gradient-boosted model scores every road segment 0–100 | Risk score with explicit confidence ratings |
| **Rank** | Segments sorted by risk; clicking opens a recommendation card | "Segment NH-766-KM12 scores 87/100 — build a crossing here" |
| **Act** | Recommendation cites evidence corridor so forest departments can budget | Decision-ready, fundable intervention plan |

> **Transparency First:** The honesty ladder currently tracks structured records against the 150-record threshold. With ~2,964 records from iNaturalist and curated GBIF datasets, the threshold is met. The predictive model may be promoted once validated on held-out spatial splits. The evidence layer — descriptive, citable collision corridors — remains the headline.

---

## Live Dashboard

The intelligence layer provides a transparency-first look at how SafePassage scores risk:

- **Model Performance** — AUC-ROC, calibration error, top-5% capture
- **Intervention Breakdown** — Wildlife crossings, fencing, signage, speed limits
- **Risk Distribution** — High / Medium / Low segment counts
- **Species Summary** — Mammalia, Aves, Reptilia, Amphibia breakdown
- **Honesty Ladder** — Real-time structured record count vs. threshold

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 · Vite · Tailwind CSS · MapLibre GL JS | Fast build, open-source maps, no billing surprise |
| **Backend** | FastAPI · Pydantic · GeoJSON | Minimal, fast, auto-generated API docs |
| **ML Pipeline** | Python · GeoPandas · SciPy · scikit-learn | Battle-tested spatial + ML stack |
| **Hosting** | Vercel (frontend) · Render (backend) | Free tier, always-live deployment |
| **Data** | iNaturalist · OpenStreetMap · ESA WorldCover | 100% open data, zero paid services |

---

## Features

| Feature | Description |
|---------|-------------|
| 🗺️ **Interactive Map** | MapLibre GL with risk-colored hotspot dots, road segments, and dossier panels |
| 📊 **Intelligence Dashboard** | Model metrics, intervention allocation, risk distribution, species summary |
| 🌗 **Dark / Light Mode** | Full theme toggle with smooth transitions |
| 🎯 **Dossier Panel** | Click any hotspot — risk gauge, seasonal curve, species mix, intervention recommendation |
| 📱 **Responsive Design** | Works on desktop, tablet, and mobile |
| 🔍 **Smart Filters** | Filter by risk score, species, highway, endangered status |
| 📋 **Report a Sighting** | Citizen-science contribution form |
| 🔬 **Methodology Page** | Honest breakdown of model capabilities and limitations |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.11
- Git

### Clone & Run

```bash
# Clone the repo
git clone https://github.com/abhay-a-nayak2305/Hack-the-Habitat.git
cd hack-the-habitat
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# API docs at http://localhost:8000/docs
```

**ML Pipeline:**
```bash
cd ml-pipeline
pip install -r requirements.txt
python -m src.ingest
```

---

## Project Structure

```
hack-the-habitat/
├── frontend/                  # React + Vite + Tailwind + MapLibre
│   ├── src/
│   │   ├── components/        # Map, Dashboard, Dossier, Filters
│   │   ├── pages/             # MapPage, Methodology, Attribution
│   │   ├── hooks/             # Data fetching with fixture fallback
│   │   ├── context/           # Theme provider (dark/light)
│   │   └── styles/            # Design system, CSS variables
│   └── public/fixtures/       # Committed data for offline dev
│
├── backend/                   # FastAPI service
│   ├── app/
│   │   ├── routers/           # hotspots, segments, stats, sightings
│   │   └── main.py            # App entrypoint
│   └── requirements.txt
│
├── ml-pipeline/               # Data ingestion → ML → GeoJSON export
│   ├── src/                   # ingest, features, kde, model, metrics
│   └── notebooks/             # Exploratory analysis
│
├── data/                      # Schema v1, fixtures, raw/processed data
├── docs/                      # Methodology, attribution, design docs
└── scripts/                   # Validation, deployment helpers
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hotspots` | All hotspot features (filtered by score, species, highway) |
| `GET` | `/api/segments` | Road segment GeoJSON |
| `GET` | `/api/stats/summary` | Headline metrics for methodology page |
| `GET` | `/api/stats/dashboard` | Full dashboard data (model metrics, interventions, species) |
| `GET` | `/api/stats/honesty-ladder` | Honesty ladder status |
| `POST` | `/api/sightings` | Submit a citizen-science sighting |
| `GET` | `/api/health` | Health check |

---

## The Anchor Story

The night-traffic ban on NH-766 through Bandipur Tiger Reserve — upheld by the Supreme Court in 2019 — ignited a running Kerala–Karnataka dispute: traders lose seven night-hours of highway, conservationists cannot prove which stretches actually kill. **Both sides argue blind.**

SafePassage outputs the evidence layer that debate is missing — for policymakers, researchers, and citizens alike.

---

## Data Sources

| Source | Role | Records | License |
|--------|------|---------|---------|
| [iNaturalist](https://www.inaturalist.org/) | Roadkill-flagged observations (structured field query) | ~28 | CC0 / CC-BY |
| [India Roadkill Monitoring Project](https://www.roadkillmonitoring.in/) | Curated citizen-science roadkill records across India | 491 | CC-BY 4.0 |
| [Anamalai Hills / Valparai Plateau](https://www.gbif.org/dataset/4c627c3e-5c70-4874-9c03-e8de46e4a9c3) | Transect-based roadkill survey, Western Ghats | 2,473 | CC-BY 4.0 |
| [OpenStreetMap](https://www.openstreetmap.org/) | Road geometry via Overpass API | — | ODbL |
| [ESA WorldCover](https://worldcover2021.esa.int/) | 10m land cover classification | — | CC-BY 4.0 |

**Total structured records: ~2,980** — above the 150-record honesty ladder threshold.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## License

This is an open-source project. See individual data source licenses for data usage terms.

---

<div align="center">

**Built with open data · zero paid services · transparency first**

*An ongoing open-source project*

</div>
