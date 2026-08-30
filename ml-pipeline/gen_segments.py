"""Generate segments between nearby hotspots."""
import json
from pathlib import Path
import numpy as np

FIXTURES_DIR = Path(__file__).parent.parent / "data" / "fixtures"

with open(FIXTURES_DIR / "hotspots.geojson") as f:
    hotspots = json.load(f)["features"]

segments = []
used = set()

for i, h1 in enumerate(hotspots):
    g1 = h1["geometry"]["coordinates"]
    for j, h2 in enumerate(hotspots):
        if j <= i:
            continue
        g2 = h2["geometry"]["coordinates"]
        dist = ((g1[0] - g2[0])**2 + (g1[1] - g2[1])**2) ** 0.5
        if dist < 0.3:  # ~33km
            key = (h1["properties"]["hotspot_id"], h2["properties"]["hotspot_id"])
            if key not in used:
                used.add(key)
                avg_risk = (h1["properties"]["risk_score"] + h2["properties"]["risk_score"]) // 2
                total_obs = h1["properties"]["observation_count"] + h2["properties"]["observation_count"]
                segments.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [g1, g2],
                    },
                    "properties": {
                        "segment_id": f"SEG-{len(segments):06d}",
                        "highway_name": "NH-766",
                        "risk_score": avg_risk,
                        "confidence": 0.3,
                        "observation_count": total_obs,
                        "road_class_score": 2,
                        "road_length_km": round(dist * 111, 1),
                        "endangered_flag": h1["properties"].get("endangered_flag", False) or h2["properties"].get("endangered_flag", False),
                    },
                })

with open(FIXTURES_DIR / "segments.geojson", "w") as f:
    json.dump({"type": "FeatureCollection", "features": segments}, f, indent=2)
print(f"Generated {len(segments)} segments")
