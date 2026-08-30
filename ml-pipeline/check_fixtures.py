import json
with open('E:/Projects/hack-the-habitat/data/fixtures/hotspots.geojson') as f:
    data = json.load(f)
features = data['features']
print(f'Hotspots: {len(features)}')
scores = [f['properties']['risk_score'] for f in features]
print(f'Risk scores: {min(scores)} - {max(scores)}')
highways = set(f['properties']['nearest_highway'] for f in features)
print(f'Highways: {highways}')
species = set()
for f in features:
    species.update(f['properties']['species_mix'].keys())
print(f'Species classes: {species}')
for f in features[:5]:
    p = f['properties']
    print(f"  {p['hotspot_id']}: risk={p['risk_score']}, obs={p['observation_count']}, species={p['species_mix']}")
