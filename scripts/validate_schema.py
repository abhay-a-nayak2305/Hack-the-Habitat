"""SafePassage — Schema Validation Script

Validates GeoJSON files against the frozen Schema v1 contracts.
Run this before committing any data or fixtures.

The correct schema is auto-selected per file based on feature geometry
(Point -> hotspots schema, LineString -> segments schema), or can be
forced with --schema. Exits 1 if any file fails validation.

Usage:
    python scripts/validate_schema.py data/fixtures/hotspots.geojson
    python scripts/validate_schema.py data/fixtures/*.geojson
    python scripts/validate_schema.py --schema data/schema/safepassage.hotspots.v1.json data/fixtures/hotspots.geojson

The script also performs data quality checks beyond schema validation:
- Warns about low-confidence features (< 0.5)
- Checks for empty season curves
- Validates risk score distributions
- Reports feature counts and summary statistics
"""
import argparse
import json
import sys
from pathlib import Path

# Ensure ml-pipeline/src is importable when run from repo root
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ml-pipeline" / "src"))

from export_geojson import load_schema, validate_geojson  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[1]
HOTSPOTS_SCHEMA = REPO_ROOT / "data" / "schema" / "safepassage.hotspots.v1.json"
SEGMENTS_SCHEMA = REPO_ROOT / "data" / "schema" / "safepassage.segments.v1.json"


def pick_schema(path: Path, forced: Path | None) -> Path:
    """Auto-select schema based on first feature geometry type."""
    if forced is not None:
        return forced
    try:
        first_geometry = json.loads(path.read_text(encoding="utf-8"))["features"][0]["geometry"]["type"]
    except Exception:
        return HOTSPOTS_SCHEMA
    return SEGMENTS_SCHEMA if first_geometry == "LineString" else HOTSPOTS_SCHEMA


def quality_checks(path: Path) -> list[str]:
    """Perform data quality checks beyond schema validation.

    Returns a list of warning messages (empty if all checks pass).
    """
    warnings = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        features = data.get("features", [])
        if not features:
            return warnings

        # Check for low-confidence features
        low_conf = [
            f["properties"].get("hotspot_id") or f["properties"].get("segment_id")
            for f in features
            if f["properties"].get("confidence", 1.0) < 0.5
        ]
        if low_conf:
            warnings.append(f"Low confidence (< 0.5): {len(low_conf)} features")

        # Check for empty season curves
        empty_curves = [
            f["properties"].get("hotspot_id") or f["properties"].get("segment_id")
            for f in features
            if sum(f["properties"].get("season_curve", [0] * 12)) == 0
        ]
        if empty_curves:
            warnings.append(f"Empty season curves: {len(empty_curves)} features")

        # Check risk score distribution
        scores = [f["properties"].get("risk_score", 0) for f in features]
        if scores:
            avg_score = sum(scores) / len(scores)
            high_risk = sum(1 for s in scores if s >= 70)
            warnings.append(f"Risk distribution: avg={avg_score:.1f}, high-risk(≥70)={high_risk}")

    except Exception:
        pass  # Don't fail on quality check errors

    return warnings


def main(paths: list[str], forced_schema: Path | None = None, quiet: bool = False) -> int:
    """Validate GeoJSON files against Schema v1 contracts.

    Args:
        paths: List of GeoJSON file paths to validate
        forced_schema: Optional path to force a specific schema
        quiet: If True, only show errors and warnings

    Returns:
        0 if all files pass, 1 if any fail
    """
    failed = False
    total_features = 0
    total_errors = 0
    total_warnings = 0

    for path_str in paths:
        path = Path(path_str)
        if not path.exists():
            if not quiet:
                print(f"SKIP: {path} does not exist")
            continue
        if path.suffix.lower() != ".geojson":
            if not quiet:
                print(f"SKIP: {path} is not a GeoJSON file")
            continue

        schema_file = pick_schema(path, forced_schema)
        if not schema_file.exists():
            print(f"ERROR: Schema file not found: {schema_file}")
            return 1

        result = validate_geojson(path, schema_file)
        status = result["status"]
        count = result["feature_count"]
        errors = result.get("errors", [])
        warnings = result.get("warnings", [])

        # Run quality checks
        quality_warns = quality_checks(path)
        warnings.extend(quality_warns)

        total_features += count
        total_errors += len(errors)
        total_warnings += len(warnings)

        label = f"{path} [{schema_file.name}]"
        if status == "valid":
            if not quiet:
                print(f"PASS: {label} ({count} features)")
        elif status == "empty":
            if not quiet:
                print(f"PASS (empty): {label}")
        else:
            print(f"FAIL: {label} ({count} features, {len(errors)} errors)")
            for err in errors[:5]:
                print(f"  - Feature {err['feature_index']}: {err['error']}")
            if len(errors) > 5:
                print(f"  ... and {len(errors) - 5} more errors")
            failed = True

        # Print warnings
        for warn in warnings:
            print(f"  WARN: {warn}")

    # Print summary
    if not quiet and len(paths) > 1:
        print(f"\nSummary: {total_features} features, {total_errors} errors, {total_warnings} warnings")

    return 1 if failed else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate SafePassage GeoJSON against Schema v1")
    parser.add_argument("paths", nargs="+", help="GeoJSON files to validate")
    parser.add_argument("--schema", default=None, help="Force a specific JSON schema file")
    parser.add_argument("--quiet", "-q", action="store_true", help="Only show errors and warnings")
    args = parser.parse_args()
    forced = Path(args.schema) if args.schema else None
    sys.exit(main(args.paths, forced, quiet=args.quiet))
