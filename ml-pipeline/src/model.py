"""SafePassage ML Pipeline — Segment Risk Model Module

Trains a GradientBoosting model on per-segment features and outputs
Schema v1-compliant risk scores. Confidence is explicitly low due to
sparse training data.
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict

import geopandas as gpd
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import auc, roc_curve
from sklearn.model_selection import GroupShuffleSplit


def prepare_training_data(segments: gpd.GeoDataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Build feature matrix and target vector from segment GeoDataFrame."""
    if segments.empty:
        raise RuntimeError("No segment data available for training")

    df = segments.copy()

    # Use observation_count as a proxy for collision presence
    df["target"] = (df["observation_count"] > 0).astype(int)

    feature_cols = ["observation_count", "endangered_flag", "distance_to_road_mean"]
    # Add land_cover if present
    if "land_cover" in df.columns:
        feature_cols.append("land_cover")

    X = df[feature_cols].fillna(0)
    y = df["target"]

    return X, y


def train_segment_model(X: pd.DataFrame, y: pd.Series, groups: pd.Series | None = None) -> Dict:
    """Train GradientBoostingClassifier and return model plus metrics."""
    if len(X) < 3 or y.sum() < 1:
        return {
            "model": None,
            "auc": 0.5,
            "top5_capture": 0.0,
            "n_samples": int(len(X)),
            "n_positive": int(y.sum()),
            "status": "skipped_insufficient_data",
        }

    # Spatial split by group if available
    if groups is not None and len(set(groups)) > 1:
        splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
        train_idx, test_idx = next(splitter.split(X, y, groups=groups))
    else:
        rng = np.random.RandomState(42)
        mask = rng.rand(len(X)) < 0.75
        train_idx, test_idx = mask, ~mask

    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

    if len(X_test) == 0 or len(np.unique(y_test)) < 2:
        # Not enough test diversity for AUC
        model = GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42)
        model.fit(X_train, y_train)
        return {
            "model": model,
            "auc": 0.5,
            "top5_capture": 0.0,
            "n_samples": int(len(X)),
            "n_positive": int(y.sum()),
            "status": "trained_no_test_diversity",
        }

    model = GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42)
    model.fit(X_train, y_train)

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
        "n_samples": int(len(X)),
        "n_positive": int(y.sum()),
        "status": "trained",
    }


def score_segments(
    segments: gpd.GeoDataFrame,
    model_info: Dict,
    model_version: str = "v0.1",
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
    # Align columns
    X = X.reindex(columns=model.feature_names_in_, fill_value=0)

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
