# Contributing to SafePassage

This document describes the coordination patterns, development workflow, and quality standards for SafePassage.

## Architecture Overview

SafePassage is a monorepo with four main components:

```
hack-the-habitat/
├── frontend/          # React + Vite + Tailwind + MapLibre
├── backend/           # FastAPI + Pydantic + JSONL persistence
├── ml-pipeline/       # Python + GeoPandas + scikit-learn
├── data/              # Schema v1, fixtures, raw/processed data
├── scripts/           # Deployment, validation, data download
└── docs/              # Methodology, attribution, demo script
```

## Team Roles

| Role | Primary Folders | Responsibilities |
|------|----------------|------------------|
| **ML Engineer** | `ml-pipeline/`, `data/raw/`, `data/processed/` | Data ingestion, feature engineering, model training, evaluation |
| **Fullstack Dev** | `frontend/`, `backend/`, `data/fixtures/` | UI components, API endpoints, deployment, documentation |

## The Frozen Contract

**Schema v1** (`data/schema/safepassage.hotspots.v1.json` and `data/schema/safepassage.segments.v1.json`) is frozen on Day 1. All components build against this contract.

### Rule: Nobody changes the contract alone

Any change to Schema v1 after the initial freeze requires:
1. Both leads to agree in writing (commit message)
2. Version bump to v2
3. All downstream components updated
4. Re-freeze ceremony

## Development Workflow

### Daily Sync Protocol

Every evening at 21:30, 15-minute standup:
- ML Engineer: data status, model progress, pipeline issues
- Fullstack Dev: UI status, API progress, deployment issues
- Contract changes require both signatures

### Fixture-First Development

1. Frontend builds against committed fixture GeoJSON from hour one
2. ML pipeline outputs real data on Day 5
3. Swapping requires no frontend changes (same Schema v1 contract)

### Data Quality Gates

Before any data commit:
```bash
python scripts/validate_schema.py data/fixtures/*.geojson data/processed/*.geojson
```

This ensures:
- Schema v1 compliance
- Low-confidence warnings
- Empty season curve detection
- Risk score distribution analysis

## Component Responsibilities

### ML Pipeline (`ml-pipeline/`)

**Files:**
- `src/ingest.py` — iNaturalist structured field query, deduplication
- `src/features.py` — OSM road join, environmental features, leakage guard
- `src/kde.py` — KDE hotspot computation, intervention rules
- `src/model.py` — GradientBoosting training, calibration, scoring
- `src/metrics.py` — Evaluation metrics, honesty ladder
- `src/export_geojson.py` — Schema v1 validation, type coercion

**Quality standards:**
- All functions have docstrings explaining purpose and return values
- Leakage guard enforced by unit tests
- Calibration error computed and documented
- Honesty ladder applied to all outputs

### Backend (`backend/`)

**Files:**
- `app/main.py` — FastAPI app, CORS, route registration
- `app/routers/hotspots.py` — Filtered hotspot queries
- `app/routers/segments.py` — Segment queries
- `app/routers/stats.py` — Live statistics from fixtures
- `app/routers/sightings.py` — POST endpoint for reports
- `app/services/geodata.py` — Fixture loading, caching, filtering

**Quality standards:**
- All endpoints have OpenAPI documentation
- Pydantic models for request/response validation
- Graceful fallbacks for missing fixtures
- Cache invalidation support for pipeline updates

### Frontend (`frontend/`)

**Files:**
- `src/components/` — UI components (Map, DossierPanel, FilterPanel, etc.)
- `src/pages/` — MapPage, MethodologyPage, AttributionPage
- `src/hooks/` — Data fetching hooks with loading states
- `src/utils/` — Format helpers, risk calculations

**Quality standards:**
- Loading skeletons for all data-dependent components
- Accessibility support (ARIA labels, keyboard navigation)
- Responsive design (mobile + desktop)
- Error boundaries and fallback states

## Testing

### ML Pipeline Tests
```bash
cd ml-pipeline
python -m pytest tests/
```

### Backend Tests
```bash
cd backend
python -m pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Deployment

### Pre-deployment Checklist
1. Run all tests
2. Validate schema: `python scripts/validate_schema.py data/fixtures/*.geojson`
3. Check for low-confidence warnings
4. Verify fixture data is current

### Deploy to Vercel
```bash
./scripts/deploy.sh          # Both frontend and backend
./scripts/deploy.sh frontend # Frontend only
./scripts/deploy.sh backend  # Backend only
```

## Code Style

### Python
- Type hints for all function signatures
- Docstrings for all public functions
- Follow PEP 8
- Use `ruff` for linting

### JavaScript/JSX
- Functional components with hooks
- PropTypes or TypeScript for type safety
- Tailwind CSS for styling
- Use ESLint + Prettier

## Communication

### Commit Messages
Use conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `test:` tests
- `refactor:` code refactoring
- `chore:` maintenance

### Issue Templates
Use the provided templates in `.github/ISSUE_TEMPLATE/`:
- Bug report
- Feature request
- Data issue

## Emergency Procedures

### Schema v1 Breaking Change
1. Stop all development
2. Both leads meet immediately
3. Assess impact on all components
4. Decide: revert or fix forward
5. Update version to v2
6. Re-freeze ceremony

### Data Pipeline Failure
1. Check logs in `ml-pipeline/`
2. Verify API endpoints are still serving fixtures
3. Frontend should show "offline" indicator
4. Fix pipeline, re-run, validate

### Deployment Failure
1. Check Vercel build logs
2. Verify environment variables
3. Roll back to previous deployment if needed
4. Fix and redeploy

## Contact

For questions about architecture or coordination:
- ML Engineer: [your contact]
- Fullstack Dev: [your contact]
