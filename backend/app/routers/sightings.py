import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.geodata import REPO_ROOT

router = APIRouter()

# Persistence: sightings are appended to a local JSONL file so they survive
# server restarts with zero external services. If SUPABASE_URL / SUPABASE_KEY
# are configured, the record is additionally pushed to Supabase (a failed
# Supabase write returns 502 so no sighting is silently lost).
DEFAULT_SIGHTINGS_FILE = REPO_ROOT / "data" / "raw" / "sightings.jsonl"

# In-memory fallback used only when the filesystem itself is unwritable.
_MEMORY_FALLBACK: List[dict] = []


class SightingIn(BaseModel):
    """Schema for incoming sighting reports.

    Required fields:
    - latitude: Observation latitude in WGS84 (-90 to 90)
    - longitude: Observation longitude in WGS84 (-180 to 180)
    - species: Common or scientific name of the species observed

    Optional fields:
    - taxonomic_class: e.g., Mammalia, Aves, Reptilia
    - highway: Nearest highway identifier, e.g., NH-766
    - observed_at: ISO 8601 timestamp; server time used if omitted
    - notes: Free-text notes (max 500 chars)
    - reporter_contact: Optional contact for follow-up
    """
    latitude: float = Field(..., ge=-90, le=90, description="Observation latitude in WGS84")
    longitude: float = Field(..., ge=-180, le=180, description="Observation longitude in WGS84")
    species: str = Field(..., min_length=1, max_length=120, description="Common or scientific name")
    taxonomic_class: Optional[str] = Field(None, description="e.g. Mammalia, Aves, Reptilia, Amphibia")
    highway: Optional[str] = Field(None, description="Nearest highway, e.g. NH-766")
    observed_at: Optional[str] = Field(None, description="ISO 8601 timestamp; server time used if omitted")
    notes: Optional[str] = Field(None, max_length=500, description="Free-text observations")
    reporter_contact: Optional[str] = Field(None, description="Optional, for follow-up only")


class SightingOut(SightingIn):
    """Schema for returned sighting records (includes server-generated fields)."""
    id: str
    received_at: str


def _sightings_file() -> Path:
    return Path(os.getenv("SIGHTINGS_FILE", str(DEFAULT_SIGHTINGS_FILE)))


def _append_sighting(record: dict) -> bool:
    """Append one JSON line. Returns True if written to disk."""
    try:
        path = _sightings_file()
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
        return True
    except OSError:
        _MEMORY_FALLBACK.append(record)
        return False


def _read_sightings(limit: int = 500) -> List[dict]:
    """Read sightings from the JSONL file.

    Returns the most recent `limit` sightings, ordered by received_at descending.
    Falls back to in-memory storage if the file is unreadable.
    """
    path = _sightings_file()
    if not path.exists():
        return _MEMORY_FALLBACK[-limit:]
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return _MEMORY_FALLBACK[-limit:]
    records = []
    for line in lines[-limit:]:
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return records


@router.post("", response_model=SightingOut)
def create_sighting(payload: SightingIn):
    """Submit a new roadkill sighting report.

    This endpoint accepts a sighting report and persists it to the dataset.
    The sighting is:
    1. Validated against the Pydantic schema
    2. Assigned a UUID and server timestamp
    3. Optionally pushed to Supabase (if configured)
    4. Appended to the local JSONL file for persistence

    The sighting will be included in the next pipeline run and will appear
    in the hotspot data once processed.

    Returns the created sighting with server-generated fields (id, received_at).
    Raises 502 if Supabase write fails (sighting is still saved locally).
    Raises 422 if validation fails.
    """
    now = datetime.now(timezone.utc).isoformat()
    record = SightingOut(
        id=str(uuid.uuid4()),
        received_at=now,
        observed_at=payload.observed_at or now,
        **payload.model_dump(exclude={"observed_at"}),
    )

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if supabase_url and supabase_key:
        try:
            import httpx

            with httpx.Client(timeout=5.0) as client:
                resp = client.post(
                    f"{supabase_url}/rest/v1/sightings",
                    headers={
                        "apikey": supabase_key,
                        "Authorization": f"Bearer {supabase_key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    json=record.model_dump(),
                )
                resp.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=f"Supabase write failed: {exc}") from exc

    _append_sighting(record.model_dump())
    return record


@router.get("", response_model=list[SightingOut])
def list_sightings(limit: int = 500):
    """List recent sightings.

    Returns the most recent sightings, ordered by received_at descending.
    Useful for:
    - Displaying recent reports on the map
    - Verifying that submissions were recorded
    - Feeding the pipeline with new observation data

    Default limit is 500, maximum is 1000.
    """
    limit = max(1, min(limit, 1000))
    return _read_sightings(limit)
