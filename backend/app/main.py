import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import dashboard, hotspots, segments, stats, sightings

app = FastAPI(
    title="SafePassage API",
    description="Roadkill hotspot predictor and wildlife-crossing planner for India's highways.",
    version="0.1.0",
)

# CORS: explicit origins win (comma-separated ALLOWED_ORIGINS env var). When
# unset we fall back to a regex covering the two places this app actually
# runs — localhost dev servers and Vercel deployments — instead of a
# blanket allow-all.
_allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_origin_regex=(
        os.getenv(
            "ALLOW_ORIGIN_REGEX",
            r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
        )
        if not _allowed
        else None
    ),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(hotspots.router, prefix="/api/hotspots", tags=["hotspots"])
app.include_router(segments.router, prefix="/api/segments", tags=["segments"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(dashboard.router, prefix="/api/stats", tags=["dashboard"])
app.include_router(sightings.router, prefix="/api/sightings", tags=["sightings"])


@app.get("/")
def root():
    return {
        "name": "SafePassage API",
        "docs": "/docs",
        "endpoints": [
            "/api/hotspots",
            "/api/segments",
            "/api/stats/summary",
            "/api/stats/dashboard",
            "/api/stats/honesty-ladder",
            "/api/sightings (POST)",
        ],
    }


@app.get("/health")
def health():
    return {"status": "ok"}

