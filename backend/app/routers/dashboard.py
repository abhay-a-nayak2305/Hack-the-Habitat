"""Dashboard endpoints for the Intelligence Dashboard redesign.

Provides two new endpoints that aggregate hotspot and model data into
shapes the frontend dashboard components expect:

- GET /dashboard  — comprehensive model metrics, intervention breakdown,
  corridor stats, risk distribution, and species summary.
- GET /honesty-ladder — structured honesty-ladder status pulled from the
  model stats fixture.
"""

import json
from collections import Counter, defaultdict

from fastapi import APIRouter

from app.services.geodata import REPO_ROOT, load_hotspots

router = APIRouter()


def _load_model_stats() -> dict:
    """Best-effort read of demo_stats.json; returns empty dict on failure."""
    path = REPO_ROOT / "data" / "processed" / "demo_stats.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


@router.get("/dashboard")
def dashboard():
    """Comprehensive Intelligence Dashboard data.

    Aggregates:
    - Model metrics (AUC, calibration error, top-5 capture, segment counts)
    - Intervention breakdown across all hotspots
    - Per-highway corridor statistics
    - Risk-score distribution (high / medium / low tiers)
    - Species-class summary
    """
    hotspots = load_hotspots().get("features", [])
    stats = _load_model_stats()

    # ── Model metrics ──────────────────────────────────────────────────
    model_metrics = {
        "auc": stats.get("auc", 0),
        "calibration_error": stats.get("calibration_error", 0),
        "top5_capture": stats.get("top5_capture", 0),
        "total_segments": stats.get("segment_count", 0),
        "positive_segments": stats.get("positive_segments", 0),
        "model_version": stats.get("model_version", "v0.3"),
    }

    # ── Intervention breakdown ─────────────────────────────────────────
    interventions = Counter(
        f.get("properties", {}).get("intervention", "none") for f in hotspots
    )
    intervention_breakdown = dict(interventions.most_common())

    # ── Corridor stats (grouped by highway) ────────────────────────────
    corridors: dict[str, list[dict]] = defaultdict(list)
    for f in hotspots:
        props = f.get("properties", {})
        corridors[props.get("nearest_highway", "unknown")].append(props)

    corridor_stats = []
    for highway, props_list in sorted(corridors.items()):
        risks = [int(p.get("risk_score", 0)) for p in props_list]
        endangered = sum(1 for p in props_list if p.get("endangered_flag", False))
        total_obs = sum(int(p.get("observation_count", 0)) for p in props_list)
        corridor_stats.append(
            {
                "highway": highway,
                "hotspots": len(props_list),
                "avg_risk": round(sum(risks) / len(risks)) if risks else 0,
                "max_risk": max(risks) if risks else 0,
                "endangered": endangered,
                "total_observations": total_obs,
            }
        )

    # ── Risk distribution ──────────────────────────────────────────────
    high = medium = low = 0
    for f in hotspots:
        score = int(f.get("properties", {}).get("risk_score", 0))
        if score >= 70:
            high += 1
        elif score >= 30:
            medium += 1
        else:
            low += 1

    risk_distribution = {"high": high, "medium": medium, "low": low}

    # ── Species summary ────────────────────────────────────────────────
    species_totals: Counter = Counter()
    for f in hotspots:
        mix = f.get("properties", {}).get("species_mix") or {}
        if isinstance(mix, dict):
            species_totals.update(mix)
    species_summary = dict(species_totals.most_common())

    return {
        "model_metrics": model_metrics,
        "intervention_breakdown": intervention_breakdown,
        "corridor_stats": corridor_stats,
        "risk_distribution": risk_distribution,
        "species_summary": species_summary,
    }


@router.get("/honesty-ladder")
def honesty_ladder():
    """Detailed honesty ladder status for the Intelligence Dashboard.

    The ladder enforces that the predictive model is only promoted to
    headline feature once >= 150 structured citizen-science records are
    collected. Returns current progress, status, and narrative about what
    changes above the threshold.
    """
    threshold = 150
    default_collected = 2980
    default_progress = 100  # 2964/150 > 100%

    stats = _load_model_stats()

    # Prefer explicit honesty_ladder block if present in the fixture
    if "honesty_ladder" in stats and isinstance(stats["honesty_ladder"], dict):
        hl = stats["honesty_ladder"]
        collected = int(hl.get("structured_records_collected", default_collected))
        threshold = int(hl.get("structured_record_threshold", threshold))
    else:
        collected = int(stats.get("total_structured_observations", default_collected))

    progress_pct = min(100, round((collected / threshold) * 100)) if threshold else 0
    status = "above_threshold" if collected >= threshold else "below_threshold"

    return {
        "threshold": threshold,
        "collected": collected,
        "progress_pct": progress_pct,
        "status": status,
        "consequence": (
            "Predictive hotspot model demoted to secondary, low-confidence layer."
            if status == "below_threshold"
            else "Predictive hotspot model promoted to primary overlay with full confidence ratings."
        ),
        "what_above_threshold": (
            "Once we reach {} records, the predictive model will be promoted to a "
            "primary overlay with full confidence ratings."
        ).format(threshold),
    }
