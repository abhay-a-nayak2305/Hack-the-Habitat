#!/usr/bin/env python3
"""Downloads India's national highway (NH) way geometry from the Overpass API
and writes it as GeoJSON for the feature-engineering join in features.py.

Usage:
    python scripts/download_osm.py --out data/raw/osm_national_highways.geojson

Note: Overpass free instances rate-limit and time out on nationwide queries.
For the seven-day build, scope the query to the specific evidence corridors
(Bandipur/NH-766, Pune-Bengaluru/NH-48, Assam/NH-37 & NH-27) rather than all
146,000 km up front — see CORRIDOR_BBOXES below.
"""
import argparse
import json
from pathlib import Path

import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Rough bounding boxes (south, west, north, east) around each evidence
# corridor, to keep queries fast and within free-tier limits.
CORRIDOR_BBOXES = {
    "NH-766_bandipur": (11.4, 76.1, 11.9, 76.7),
    "NH-48_pune_bengaluru": (12.5, 74.5, 18.6, 75.5),
    "NH-37_assam": (26.3, 93.2, 27.1, 94.0),
    "NH-27_assam": (25.8, 90.2, 26.4, 91.0),
}


def build_query(bbox):
    s, w, n, e = bbox
    return f"""
    [out:json][timeout:60];
    (
      way["highway"~"trunk|primary"]["ref"~"NH"]({s},{w},{n},{e});
    );
    out geom;
    """


def overpass_to_geojson(overpass_json: dict) -> dict:
    features = []
    for el in overpass_json.get("elements", []):
        if el.get("type") != "way" or "geometry" not in el:
            continue
        coords = [[pt["lon"], pt["lat"]] for pt in el["geometry"]]
        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {
                "osm_way_id": str(el["id"]),
                "highway_name": el.get("tags", {}).get("ref", "unknown"),
            },
        })
    return {"type": "FeatureCollection", "features": features}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/raw/osm_national_highways.geojson")
    args = parser.parse_args()

    all_features = []
    for name, bbox in CORRIDOR_BBOXES.items():
        resp = requests.post(OVERPASS_URL, data={"data": build_query(bbox)}, timeout=90)
        resp.raise_for_status()
        fc = overpass_to_geojson(resp.json())
        all_features.extend(fc["features"])
        print(f"{name}: {len(fc['features'])} ways")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps({"type": "FeatureCollection", "features": all_features}, indent=2))
    print(f"Wrote {len(all_features)} total ways to {out_path}")


if __name__ == "__main__":
    main()
