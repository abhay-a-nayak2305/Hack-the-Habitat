"""Backend API tests — run from backend/ with: python -m pytest tests/"""
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402

client = TestClient(app)

REQUIRED_HOTSPOT_PROPS = [
    "hotspot_id", "risk_score", "confidence", "species_mix", "endangered_flag",
    "season_curve", "observation_count", "nearest_highway", "intervention",
    "model_version",
]


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_root_lists_endpoints():
    body = client.get("/").json()
    assert body["name"] == "SafePassage API"
    assert any("hotspots" in e for e in body["endpoints"])


def test_hotspots_returns_schema_features():
    body = client.get("/api/hotspots").json()
    assert body["type"] == "FeatureCollection"
    assert len(body["features"]) > 0
    for feat in body["features"]:
        props = feat["properties"]
        for key in REQUIRED_HOTSPOT_PROPS:
            assert key in props, f"missing {key}"
        assert 0 <= props["risk_score"] <= 100
        assert 0 <= props["confidence"] <= 1
        assert len(props["season_curve"]) == 12
        assert feat["geometry"]["type"] == "Point"


def test_hotspots_min_score_filter():
    body = client.get("/api/hotspots", params={"min_score": 70}).json()
    assert all(f["properties"]["risk_score"] >= 70 for f in body["features"])
    assert len(body["features"]) < len(client.get("/api/hotspots").json()["features"])


def test_hotspots_species_filter():
    body = client.get("/api/hotspots", params={"species": "Mammalia"}).json()
    assert all(
        f["properties"]["species_mix"].get("Mammalia", 0) > 0 for f in body["features"]
    )


def test_hotspots_endangered_only_filter():
    body = client.get("/api/hotspots", params={"endangered_only": "true"}).json()
    assert all(f["properties"]["endangered_flag"] for f in body["features"])


def test_unknown_hotspot_is_404():
    assert client.get("/api/hotspots/HS-999999").status_code == 404


def test_unknown_segment_is_404():
    assert client.get("/api/segments/SEG-999999").status_code == 404


def test_segments_valid_line_strings():
    body = client.get("/api/segments").json()
    assert len(body["features"]) > 0
    for feat in body["features"]:
        assert feat["geometry"]["type"] == "LineString"
        assert "segment_id" in feat["properties"]
        assert "highway_name" in feat["properties"]


def test_stats_summary_shape():
    body = client.get("/api/stats/summary").json()
    assert body["hotspot_count"] > 0
    assert body["segment_count"] > 0
    assert "honesty_ladder" in body
    assert body["honesty_ladder"]["structured_record_threshold"] == 150


def test_sighting_roundtrip_persists(tmp_path, monkeypatch):
    monkeypatch.setenv("SIGHTINGS_FILE", str(tmp_path / "sightings.jsonl"))
    payload = {"latitude": 11.67, "longitude": 76.42, "species": "Chital"}
    resp = client.post("/api/sightings", json=payload)
    assert resp.status_code == 200
    record = resp.json()
    assert record["id"]
    assert record["received_at"]

    listed = client.get("/api/sightings").json()
    assert any(s["id"] == record["id"] for s in listed)
    # Actually written to disk (durable across restarts)
    assert (tmp_path / "sightings.jsonl").exists()


def test_sighting_validation_rejects_bad_input():
    resp = client.post("/api/sightings", json={"latitude": 999, "longitude": 0, "species": ""})
    assert resp.status_code == 422
