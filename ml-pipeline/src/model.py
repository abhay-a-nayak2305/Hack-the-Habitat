"""SafePassage ML Pipeline — Segment Risk Model Module

Trains a calibrated GradientBoosting model on per-segment *environmental*
features and outputs Schema v1-compliant risk scores. Confidence is
explicitly low due to sparse training data.

Leakage guard: the label is derived from `observation_count` (roadkill
observations joined to the segment), so `observation_count` and anything
computed from a segment's own observations is NEVER used as a feature.
Features describe the road and its surroundings only — see FEATURE_COLS.
"""
from __future__ import annotations

from typing import Dict

import geopandas as gpd
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import auc, roc_curve
from sklearn.model_selection import GroupShuffleSplit, train_test_split

# Environmental / road-attribute features. None of these may be derived
# from the segment's own observation records (that would leak the label).
FEATURE_COLS = [
    "road_class_score",   # motorway/trunk=3, primary=2, secondary=1, other=0
    "road_length_km",     # segment length in kilometres
    "forest_share",       # share of the 500 m corridor buffer covered by forest
    "water_distance_m",   # metres to the nearest water body / waterway
    "neighbor_density",   # observations within 2 km of the segment, excluding its own
]

MIN_SAMPLES_FOR_CALIBRATION = 12
MIN_POSITIVES_FOR_CALIBRATION = 3


def prepare_training_data(segments: gpd.GeoDataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Build feature matrix and target vector from a segment GeoDataFrame."""
    if segments.empty:
        raise RuntimeError("No segment data available for training")

    df = segments.copy()

    if "observation_count" not in df.columns:
        raise RuntimeError("Segments are missing observation_count — cannot build label")

    # Label: does this segment carry any roadkill observations?
    df["target"] = (pd.to_numeric(df["observation_count"], errors="coerce").fillna(0) > 0).astype(int)

    available = [c for c in FEATURE_COLS if c in df.columns]
    if not available:
        raise RuntimeError(
            "No usable environmental features found. Expected some of: "
            + ", ".join(FEATURE_COLS)
        )

    X = df[available].apply(pd.to_numeric, errors="coerce").fillna(0.0)
    return X, df["target"]


def calibration_error(y_true, y_proba, n_bins: int = 5) -> float:
    """Mean absolute gap between predicted and observed positive rate across
    quantile bins — the calibration metric documented in docs/methodology.md.

    Returns 0.0 when the split has no class diversity (nothing to calibrate).
    """
    y_true = np.asarray(y_true)
    y_proba = np.asarray(y_proba, dtype=float)
    if len(y_true) == 0 or len(np.unique(y_true)) < 2:
        return 0.0

    edges = np.quantile(y_proba, np.linspace(0.0, 1.0, n_bins + 1))
    if edges[0] == edges[-1]:
        # Degenerate (all probabilities identical) — single bin
        return float(abs(y_proba.mean() - y_true.mean()))

    edges[0], edges[-1] = -np.inf, np.inf
    errors = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        mask = (y_proba >= lo) & (y_proba < hi)
        if mask.sum() == 0:
            continue
        errors.append(abs(y_proba[mask].mean() - y_true[mask].mean()))
    return float(np.mean(errors)) if errors else 0.0


def _fit_model(X_train: pd.DataFrame, y_train: pd.Series, calibrate: bool):
    base = GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42)
    if not calibrate:
        base.fit(X_train, y_train)
        return base, False
    try:
        calibrated = CalibratedClassifierCV(base, method="isotonic", cv=3)
        calibrated.fit(X_train, y_train)
        return calibrated, True
    except Exception:
        # Not enough samples per class for 3-fold calibration — fall back
        base.fit(X_train, y_train)
        return base, False


def train_segment_model(X: pd.DataFrame, y: pd.Series, groups: pd.Series | None = None) -> Dict:
    """Train a (calibrated) GradientBoostingClassifier and return model plus metrics."""
    if len(X) < 3 or y.sum() < 1:
        return {
            "model": None,
            "auc": 0.5,
            "top5_capture": 0.0,
            "calibration_error": 0.0,
            "calibrated": False,
            "feature_names": list(X.columns),
            "n_samples": int(len(X)),
            "n_positive": int(y.sum()),
            "status": "skipped_insufficient_data",
        }

    # Spatial split by group when available; otherwise a stratified random
    # split so both classes always survive into train and test.
    X_train = X_test = y_train = y_test = None
    if groups is not None and len(set(groups)) > 1:
        splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
        train_idx, test_idx = next(splitter.split(X, y, groups=groups))
        cand = (X.iloc[train_idx], X.iloc[test_idx], y.iloc[train_idx], y.iloc[test_idx])
        if len(np.unique(cand[2])) > 1 and len(np.unique(cand[3])) > 1:
            X_train, X_test, y_train, y_test = cand
    if X_train is None:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y if y.nunique() > 1 else None
        )

    if len(np.unique(y_train)) < 2:
        return {
            "model": None,
            "auc": 0.5,
            "top5_capture": 0.0,
            "calibration_error": 0.0,
            "calibrated": False,
            "feature_names": list(X.columns),
            "n_samples": int(len(X)),
            "n_positive": int(y.sum()),
            "status": "skipped_single_class_train_split",
        }

    calibrate = (
        len(X_train) >= MIN_SAMPLES_FOR_CALIBRATION
        and int(y_train.sum()) >= MIN_POSITIVES_FOR_CALIBRATION
        and int((y_train == 0).sum()) >= MIN_POSITIVES_FOR_CALIBRATION
    )
    model, was_calibrated = _fit_model(X_train, y_train, calibrate)

    if len(X_test) == 0 or len(np.unique(y_test)) < 2:
        # Not enough test diversity for AUC — train metrics only
        return {
            "model": model,
            "auc": 0.5,
            "top5_capture": 0.0,
            "calibration_error": 0.0,
            "calibrated": was_calibrated,
            "feature_names": list(X.columns),
            "n_samples": int(len(X)),
            "n_positive": int(y.sum()),
            "status": "trained_no_test_diversity",
        }

    y_proba = model.predict_proba(X_test)[:, 1]
    fpr, tpr, _ = roc_curve(y_test, y_proba)
    auc_score = float(auc(fpr, tpr)) if len(np.unique(y_test)) > 1 else 0.5

    # Top-5% capture: fraction of positive cases in the top-scoring 5% of test set
    top_n = max(1, int(np.ceil(len(y_test) * 0.05)))
    top_idx = np.argsort(y_proba)[-top_n:]
    top5_capture = float(y_test.iloc[top_idx].sum() / max(1, int(y_test.sum())))

    return {
        "model": model,
        "auc": auc_score,
        "top5_capture": top5_capture,
        "calibration_error": calibration_error(y_test, y_proba),
        "calibrated": was_calibrated,
        "feature_names": list(X.columns),
        "n_samples": int(len(X)),
        "n_positive": int(y.sum()),
        "status": "trained",
    }


def score_segments(
    segments: gpd.GeoDataFrame,
    model_info: Dict,
    model_version: str = "v0.3",
    confidence_tier: str = "low",
) -> gpd.GeoDataFrame:
    """Score all segments with the trained model and attach Schema v1 fields."""
    if model_info.get("model") is None or segments.empty:
        # Return unmodified segments with low scores
        out = segments.copy()
        out["risk_score"] = 0
        out["confidence"] = 0.2
        out["model_version"] = model_version
        out["confidence_tier"] = confidence_tier
        return out

    model = model_info["model"]
    X, _ = prepare_training_data(segments)
    feature_names = model_info.get("feature_names") or getattr(model, "feature_names_in_", None)
    if feature_names is not None:
        X = X.reindex(columns=list(feature_names), fill_value=0)

    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[:, 1]
    else:
        proba = model.predict(X)

    risk_score = (proba * 100).clip(0, 100).astype(int)

    out = segments.copy()
    out["risk_score"] = risk_score
    out["confidence"] = 0.3 if confidence_tier == "low" else 0.7
    out["model_version"] = model_version
    out["confidence_tier"] = confidence_tier
    return out

