#!/usr/bin/env python3
"""One-off downloader for iNaturalist structured roadkill observations.
Thin CLI wrapper around ml-pipeline/src/ingest.py so it can be run without
importing the package (e.g. from CI or a fresh clone).

Usage:
    python scripts/download_inaturalist.py --out data/raw/inaturalist_roadkill_india.csv
    python scripts/download_inaturalist.py --discover-fields   # list observation field IDs to find "roadkill"
"""
import argparse
import sys
from pathlib import Path

import requests

FIELDS_SEARCH_URL = "https://api.inaturalist.org/v1/observation_fields"


def discover_fields(query: str = "roadkill"):
    resp = requests.get(FIELDS_SEARCH_URL, params={"q": query}, timeout=20)
    resp.raise_for_status()
    for field in resp.json().get("results", []):
        print(f"id={field['id']:<8} name={field['name']}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/raw/inaturalist_roadkill_india.csv")
    parser.add_argument("--discover-fields", action="store_true",
                         help="List candidate observation_field IDs matching 'roadkill' and exit")
    args = parser.parse_args()

    if args.discover_fields:
        discover_fields()
        return

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "ml-pipeline"))
    from src.ingest import query_inaturalist_roadkill, deduplicate_observations  # noqa: E402

    gdf = deduplicate_observations(query_inaturalist_roadkill())
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    if gdf.empty:
        print("No roadkill observations returned — wrote empty CSV")
        gdf.drop(columns=gdf.columns.tolist()).to_csv(args.out, index=False)
        return
    gdf.drop(columns="geometry").to_csv(args.out, index=False)
    print(f"Wrote {len(gdf)} records to {args.out}")


if __name__ == "__main__":
    main()
