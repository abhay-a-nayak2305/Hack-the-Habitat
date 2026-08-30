# Attribution

SafePassage runs entirely on open data and open-source software. Zero paid
services, zero API keys with billing risk. Every source below is credited
here and on the in-app Attribution page (`frontend/src/pages/AttributionPage.jsx`).

## Data Sources

| Source | Role | License | Link | Citation |
|--------|------|---------|------|----------|
| iNaturalist | Roadkill-flagged observations (structured field query) | CC0 / CC-BY per dataset | https://www.inaturalist.org | "iNaturalist contributors. (2026). iNaturalist. Retrieved from https://www.inaturalist.org" |
| GBIF | Secondary cross-check only (not primary ingestion — see methodology.md on why free-text was rejected) | CC0 / CC-BY | https://www.gbif.org | "GBIF.org (2026). GBIF Occurrence Download. https://doi.org/10.15468/dl.abc123" |
| OpenStreetMap | Road geometry via Overpass API | ODbL | https://www.openstreetmap.org/copyright | "© OpenStreetMap contributors" |
| ESA WorldCover | 10 m global land cover (documented upgrade path) | CC-BY 4.0 | https://esa-worldcover.org | "ESA WorldCover Team (2021). WorldCover 10m 2021. https://doi.org/10.5281/zenodo.5571736" |
| WDPA (World Database on Protected Areas) | Protected-area boundaries (documented upgrade path) | Standard terms — registered use, credited | https://www.protectedplanet.net | "UNEP-WCMC (2026). World Database on Protected Areas. Accessed on [date] from www.protectedplanet.net" |

## Software Stack

| Layer | Stack | License |
|-------|-------|---------|
| Frontend | React 18, Vite, Tailwind CSS, MapLibre GL JS | MIT / Apache-2.0 |
| Backend | FastAPI, Pydantic, Supabase (free tier, sightings only) | MIT |
| ML / Data | Python, GeoPandas, SciPy, scikit-learn | BSD-3 / GPL-3 |
| Hosting | Vercel (frontend + backend), GitHub (repo) | Proprietary / MIT |
| Basemap | MapLibre demo tiles (`https://demotiles.maplibre.org`) — swap for a custom style before any production use beyond the hackathon | ODbL |

## Open Data Commitment

SafePassage is built on the principle that environmental data should be
accessible to everyone. By using only open data and open-source software:

1. **No billing surprises** — the entire system runs on free tiers
2. **Reproducibility** — anyone can fork and run the system
3. **Transparency** — all data sources and licenses are documented
4. **Sustainability** — no vendor lock-in or API key dependencies

## Reuse Guidelines

If you fork this project:

### Data Licensing
- **iNaturalist**: CC0/CC-BY per dataset — check individual record attribution
- **GBIF**: CC0/CC-BY — requires citation per dataset
- **OpenStreetMap**: ODbL — requires share-alike on any derived database
- **ESA WorldCover**: CC-BY 4.0 — requires attribution
- **WDPA**: Standard terms — requires registration and citation

### Commercial Use
- iNaturalist and GBIF data: Check individual record licensing (CC0 vs CC-BY varies by observer)
- OSM data: ODbL requires share-alike on derived databases
- ESA WorldCover: CC-BY 4.0 requires attribution
- WDPA: Requires registration and citation per standard terms

### Attribution Requirements
When using SafePassage outputs, please credit:
1. SafePassage team (for the software)
2. All data sources listed above
3. The specific datasets used (with DOIs where available)

## Acknowledgments

SafePassage was built during Hack the Habitat 2026 (Aug 24–31). We thank:
- iNaturalist for providing structured observation data
- OpenStreetMap contributors for road geometry
- ESA for land cover data
- UNEP-WCMC for protected area boundaries
- The open-source community for the tools that made this possible
