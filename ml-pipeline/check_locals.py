import json, requests

# Fetch a sample of "unknown highway" observations from GBIF
datasets = [
    ("f334ae5e-0991-44bb-b64b-d602f4c8c289", "India Roadkill"),
    ("4c627c3e-5c70-4874-9c03-e8de46e4a9c3", "Anamalai"),
]

for ds_key, ds_name in datasets:
    print(f"\n{ds_name} - Sample localities:")
    url = f"https://api.gbif.org/v1/occurrence/search?datasetKey={ds_key}&hasCoordinate=true&limit=5&offset=0"
    resp = requests.get(url, timeout=30)
    results = resp.json().get("results", [])
    for r in results:
        loc = r.get("locality", "")
        remarks = r.get("locationRemarks", "")
        print(f"  Locality: {loc[:100]}")
        print(f"  Remarks: {remarks}")
        print(f"  State: {r.get('stateProvince', '')}")
        print()
