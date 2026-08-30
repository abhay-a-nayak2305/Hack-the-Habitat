from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.geodata import load_segments, filter_features

router = APIRouter()


@router.get("")
def get_segments(
    min_score: Optional[int] = Query(None, ge=0, le=100),
    highway: Optional[str] = Query(None, description="Filter by highway_name, e.g. NH-766"),
):
    """Filtered Schema v1 segments FeatureCollection (OSM way geometry + score)."""
    collection = load_segments()
    return filter_features(collection, min_score=min_score, highway=highway)


@router.get("/{segment_id}")
def get_segment(segment_id: str):
    """Full segment dossier."""
    collection = load_segments()
    for feat in collection["features"]:
        if feat["properties"]["segment_id"] == segment_id:
            return feat
    raise HTTPException(status_code=404, detail=f"Segment not found: {segment_id}")

