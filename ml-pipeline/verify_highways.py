import json
with open('E:/Projects/hack-the-habitat/data/fixtures/hotspots.geojson') as f:
    data = json.load(f)
features = data['features']

# Check highway names
hw_counts = {}
for f in features:
    hw = f['properties']['nearest_highway']
    hw_counts[hw] = hw_counts.get(hw, 0) + 1

print(f"Total hotspots: {len(features)}")
print(f"\nHighway distribution:")
for hw, count in sorted(hw_counts.items(), key=lambda x: -x[1])[:15]:
    print(f"  {hw}: {count}")

# Show a few examples with details
print("\nSample hotspots:")
for f in features[:5]:
    p = f['properties']
    print(f"  {p['hotspot_id']}: risk={p['risk_score']}, obs={p['observation_count']}, highway={p['nearest_highway']}, species={list(p['species_mix'].keys())[:3]}")
