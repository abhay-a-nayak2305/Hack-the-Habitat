"""SafePassage ML Pipeline — Metrics Module

Computes evaluation metrics for the segment risk model and exports
a summary JSON for the methodology page and /api/stats/summary.

Metrics are computed on a held-out spatial split and carry a caveat:
with only 92 structured records, all numbers are directional rather
than statistically definitive. The honesty ladder enforces this by
demoting the predictive layer below 150 records.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Optional

import geopandas as gpd
import numpy as np
from sklearn.metrics import auc, roc_curve  # noqa: F401  (re-exported for tests)


def compute_metrics(
    segments: gpd.GeoDataFrame,
    model_info: Dict,
) -> Dict:
    """Compute headline metrics from model training results.

    Returns a dictionary containing:
    - Evaluation metrics: AUC, top-5% capture, calibration error
    - Data provenance: observation counts, segment counts, feature names
    - Honesty ladder status: whether the 150-record threshold is met
    - Model metadata: version, confidence tier, calibration status

    All metrics carry the caveat that they are computed on sparse data
    and should be treated as directional.
    """
    n_samples = int(model_info.get("n_samples", len(segments)))
    n_positive = int(model_info.get("n_positive", 0))
    auc_score = float(model_info.get("auc", 0.5))
    top5_capture = float(model_info.get("top5_capture", 0.0))
    calib_error = float(model_info.get("calibration_error", 0.0))
    status = str(model_info.get("status", "unknown"))

    total_observations = (
        int(segments["observation_count"].sum())
        if not segments.empty and "observation_count" in segments.columns
        else n_samples
    )

    # Compute additional provenance metrics
    segment_count = int(len(segments))
    positive_rate = round(n_positive / max(1, segment_count), 4)
    avg_risk_score = (
        round(float(segments["risk_score"].mean()), 2)
        if not segments.empty and "risk_score" in segments.columns
        else 0.0
    )
    high_risk_count = (
        int((segments["risk_score"] >= 70).sum())
        if not segments.empty and "risk_score" in segments.columns
        else 0
    )

    summary = {
        # Data provenance
        "total_observations": total_observations,
        "total_structured_observations": total_observations,
        "segment_count": segment_count,
        "positive_segments": n_positive,
        "positive_rate": positive_rate,
        "avg_risk_score": avg_risk_score,
        "high_risk_segments": high_risk_count,
        # Evaluation metrics
        "auc": round(auc_score, 4),
        "top5_capture": round(top5_capture, 4),
        "calibration_error": round(calib_error, 4),
        "calibrated": bool(model_info.get("calibrated", False)),
        # Model metadata
        "feature_names": list(model_info.get("feature_names", [])),
        "model_version": "v0.3",
        "confidence_tier": "low",
        "status": status,
        # Caveat
        "caveat": (
            "All metrics computed on sparse citizen-science data (~92 records). "
            "Treat as directional, not statistically definitive. "
            "The predictive layer is secondary to the evidence layer."
        ),
        "notes": (
            "Model trained on sparse citizen-science data. "
            "Predictive layer is secondary to the evidence layer. "
            "No risk scores are extrapolated into zero-coverage areas."
        ),
        "honesty_ladder": {
            "structured_record_threshold": 150,
            "structured_records_collected": total_observations,
            "status": (
                "below_threshold"
                if total_observations < 150
                else "at_or_above_threshold"
            ),
            "consequence": (
                "Predictive hotspot model demoted to secondary, low-confidence layer. "
                "Evidence layer (descriptive collision corridors) is the headline feature."
                if total_observations < 150
                else "Structured record threshold met; predictive layer may be promoted "
                "once validated on held-out spatial splits."
            ),
            "progress_pct": min(100, round((total_observations / 150) * 100)),
        },
    }
    return summary


def save_metrics(metrics: Dict, output_path: Path) -> Path:
    """Save metrics summary to JSON."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(metrics, indent=2))
    return output_path


def build_metrics_from_segments(
    segments_path: Path,
    model_info: Dict,
    output_path: Path,
) -> Dict:
    """End-to-end metrics builder."""
    segments = gpd.read_file(segments_path)
    metrics = compute_metrics(segments, model_info)
    saved_path = save_metrics(metrics, output_path)
    return {"metrics": metrics, "path": str(saved_path)}
