import json
with open('E:/Projects/hack-the-habitat/data/processed/merged_observations.geojson') as f:
    data = json.load(f)
features = data['features']

# Check locality fields
has_locality = sum(1 for f in features if f.get('properties', {}).get('locality'))
has_state = sum(1 for f in features if f.get('properties', {}).get('state_province'))
has_vernacular = sum(1 for f in features if f.get('properties', {}).get('vernacular_name'))

print(f"Total records: {len(features)}")
print(f"With locality: {has_locality}")
print(f"With state: {has_state}")
print(f"With vernacular name: {has_vernacular}")

# Show some examples with locality
print("\nSample localities:")
count = 0
for f in features:
    props = f.get('properties', {})
    loc = props.get('locality', '')
    state = props.get('state_province', '')
    if loc and count < 20:
        print(f"  {loc} | {state} | {props.get('species', 'unknown')}")
        count += 1
