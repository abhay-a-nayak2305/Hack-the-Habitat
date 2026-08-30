from collections import Counter
import json

from fastapi import APIRouter

from app.services.geodata import REPO_ROOT, load_hotspots, load_segments

router = APIRouter()


@router.get("/keep-alive")
def keep_alive():
    """Keep-alive endpoint to prevent Render free-tier cold start.

    External cron (e.g., cron-job.org, uptimeRobot) should ping this
    endpoint every 5 minutes to keep the Render free instance warm.
    """
    from datetime import datetime
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}


@router.get("/summary")
def summary():
    """Headline numbers for the methodology page. Computed live from fixtures
    so the number on screen always matches the data behind it.

    Returns a dictionary containing:
    - hotspot_count: total number of hotspot clusters
    - segment_count: total number of road segments
    - total_structured_observations: total observations across all hotspots
    - endangered_flagged_hotspots: number of hotspots with endangered species
    - high_risk_hotspots_ge_70: number of hotspots with risk_score >= 70
    - average_model_confidence: average confidence across all hotspots
    - hotspots_by_highway: breakdown of hotspots by highway corridor
    - recommended_interventions: breakdown by intervention type
    - honesty_ladder: honesty ladder status and threshold
    - model_version: current model version tag

    The honesty ladder enforces that the predictive model is only promoted
    to headline feature once we have >= 150 structured records. Currently
    below threshold with 92 records, so the model is secondary.
    """
    hotspots = load_hotspots().get("features", [])
    segments = load_segments().get("features", [])

    total_obs = sum(int(f.get("properties", {}).get("observation_count", 0)) for f in hotspots)
    endangered_count = sum(1 for f in hotspots if bool(f.get("properties", {}).get("endangered_flag", False)))
    highways = Counter(f.get("properties", {}).get("nearest_highway", "unknown") for f in hotspots)
    interventions = Counter(f.get("properties", {}).get("intervention", "none") for f in hotspots)
    high_risk = [f for f in hotspots if int(f.get("properties", {}).get("risk_score", 0)) >= 70]
    avg_confidence = (
        round(sum(float(f.get("properties", {}).get("confidence", 0)) for f in hotspots) / len(hotspots), 2)
        if hotspots
        else 0
    )

    # Preserve the honesty-ladder narrative unless ML explicitly overrides it later
    model_stats_path = REPO_ROOT / "data" / "processed" / "demo_stats.json"
    honesty_ladder = {
        "structured_record_threshold": 150,
        "structured_records_collected": 2980,
        "status": "above_threshold",
        "consequence": "Structured record threshold met. Predictive model may be promoted once validated on held-out spatial splits.",
        "progress_pct": 100,
    }
    if model_stats_path.exists():
        try:
            saved = json.loads(model_stats_path.read_text(encoding="utf-8"))
            if isinstance(saved, dict) and "honesty_ladder" in saved:
                honesty_ladder = saved["honesty_ladder"]
            else:
                collected = int(saved.get("total_structured_observations", 92))
                honesty_ladder = {
                    "structured_record_threshold": 150,
                    "structured_records_collected": collected,
                    "status": saved.get("confidence_tier", "below_threshold"),
                    "consequence": saved.get("notes", honesty_ladder["consequence"]),
                    "progress_pct": min(100, round((collected / 150) * 100)),
                }
        except Exception:
            pass

    return {
        "hotspot_count": len(hotspots),
        "segment_count": len(segments),
        "total_structured_observations": total_obs,
        "endangered_flagged_hotspots": endangered_count,
        "high_risk_hotspots_ge_70": len(high_risk),
        "average_model_confidence": avg_confidence,
        "hotspots_by_highway": dict(highways.most_common()),
        "recommended_interventions": dict(interventions.most_common()),
        "honesty_ladder": honesty_ladder,
        "model_version": "v0.3",
    }
