import json
with open('E:/Projects/hack-the-habitat/data/fixtures/hotspots.geojson') as f:
    data = json.load(f)
features = data['features']

# Check what fields are "unknown"
unknown_highway = sum(1 for f in features if f['properties']['nearest_highway'] == 'unknown')
unknown_species = sum(1 for f in features if not f['properties']['species_mix'] or 'unknown' in f['properties']['species_mix'])
no_endangered = sum(1 for f in features if not f['properties']['endangered_flag'])

print(f"Total hotspots: {len(features)}")
print(f"Unknown highway: {unknown_highway}/{len(features)}")
print(f"Unknown/empty species: {unknown_species}/{len(features)}")
print(f"No endangered flag: {no_endangered}/{len(features)}")

# Show a few examples with their locality data
print("\nSample hotspots with locality info:")
for f in features[:10]:
    p = f['properties']
    print(f"  {p['hotspot_id']}: highway={p['nearest_highway']}, species={list(p['species_mix'].keys())[:3]}, sources={p.get('sources', [])}")
