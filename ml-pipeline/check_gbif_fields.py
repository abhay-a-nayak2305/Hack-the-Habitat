import json
with open('E:/Projects/hack-the-habitat/data/processed/merged_observations.geojson') as f:
    data = json.load(f)
features = data['features']

# Check locality field for highway info
localities = []
for f in features[:200]:
    props = f.get('properties', {})
    loc = props.get('locality', '')
    if loc and ('NH' in loc or 'Highway' in loc or 'highway' in loc.lower()):
        localities.append(loc)

print(f"Records with highway info in locality: {len(localities)} out of {len(features)}")
for loc in localities[:20]:
    print(f"  {loc}")

# Also check what fields are available
print("\nAvailable fields in GBIF data:")
if features:
    print(list(features[0].get('properties', {}).keys()))
