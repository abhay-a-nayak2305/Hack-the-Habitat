"""SafePassage — Schema Validation Script

Validates GeoJSON files against the frozen Schema v1 contract.
Run this before committing any data or fixtures.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure ml-pipeline/src is importable when run from repo root
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ml-pipeline" / "src"))

from export_geojson import validate_geojson, load_schema  # noqa: E402


def main(paths: list[str], schema_path: str = "data/schema/safepassage.hotspots.v1.json") -> int:
    schema_file = Path(schema_path)
    if not schema_file.exists():
        print(f"ERROR: Schema file not found: {schema_file}")
        return 1

    failed = False
    for path_str in paths:
        path = Path(path_str)
        if not path.exists():
            print(f"SKIP: {path} does not exist")
            continue

        result = validate_geojson(path, schema_file)
        status = result["status"]
        count = result["feature_count"]
        errors = result["errors"]

        if status == "valid":
            print(f"PASS: {path} ({count} features)")
        elif status == "empty":
            print(f"PASS (empty): {path}")
        else:
            print(f"FAIL: {path} ({count} features, {len(errors)} errors)")
            for err in errors[:5]:
                print(f"  - Feature {err['feature_index']}: {err['error']}")
            failed = True

    return 1 if failed else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validate_schema.py <geojson_path> [<geojson_path> ...]")
        sys.exit(1)
    sys.exit(main(sys.argv[1:]))
