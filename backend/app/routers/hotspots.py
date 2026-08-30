from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.geodata import load_hotspots, filter_features

router = APIRouter()


@router.get("")
def get_hotspots(
    min_score: Optional[int] = Query(None, ge=0, le=100, description="Only return hotspots at or above this risk score"),
    species: Optional[str] = Query(None, description="Filter by taxonomic class present in species_mix, e.g. Mammalia"),
    highway: Optional[str] = Query(None, description="Filter by nearest_highway, e.g. NH-766"),
    endangered_only: bool = Query(False, description="Only return hotspots flagged endangered_flag=true"),
):
    """Filtered Schema v1 hotspot FeatureCollection for the map layer."""
    collection = load_hotspots()
    return filter_features(
        collection,
        min_score=min_score,
        species=species,
        highway=highway,
        endangered_only=endangered_only,
    )


@router.get("/{hotspot_id}")
def get_hotspot(hotspot_id: str):
    """Full dossier for a single hotspot — powers the recommendation card."""
    collection = load_hotspots()
    for feat in collection["features"]:
        if feat["properties"]["hotspot_id"] == hotspot_id:
            return feat
    raise HTTPException(status_code=404, detail=f"Hotspot not found: {hotspot_id}")

