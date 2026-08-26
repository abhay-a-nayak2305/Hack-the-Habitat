"""SafePassage ML Pipeline — Metrics Module

Computes evaluation metrics for the segment risk model and exports
a summary JSON for the methodology page and /api/stats/summary.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

import geopandas as gpd
import pandas as pd
from sklearn.metrics import auc, roc_curve


def compute_metrics(
    segments: gpd.GeoDataFrame,
    model_info: Dict,
) -> Dict:
    """Compute headline metrics from model training results."""
    n_samples = int(model_info.get("n_samples", len(segments)))
    n_positive = int(model_info.get("n_positive", 0))
    auc_score = float(model_info.get("auc", 0.5))
    top5_capture = float(model_info.get("top5_capture", 0.0))
    status = str(model_info.get("status", "unknown"))

    summary = {
        "total_observations": n_samples,
        "positive_segments": n_positive,
        "auc": round(auc_score, 4),
        "top5_capture": round(top5_capture, 4),
        "model_version": "v0.1",
        "confidence_tier": "low",
        "status": status,
        "notes": (
            "Model trained on sparse citizen-science data. "
            "Predictive layer is secondary to the evidence layer. "
            "No risk scores are extrapolated into zero-coverage areas."
        ),
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
