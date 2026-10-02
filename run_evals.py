"""Run the current scene prompt against every eval frame and score object coverage.

    python run_evals.py [--sleep 5] [--frames evals/frames] [--expected evals/expected.json]

A frame passes when every required object (any listed synonym) appears in the description
or object list. The score is printed and written to evals/results.json. --sleep keeps a
full run under the free-tier per-minute limit.
"""
import argparse
import json
import sys
import time
from pathlib import Path

from PIL import Image

import config
import vision


def contains(text: str, alternatives: str) -> bool:
    return any(alt.strip().lower() in text for alt in alternatives.split("|") if alt.strip())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sleep", type=float, default=5.0, help="seconds between calls (default 5)")
    parser.add_argument("--frames", default=str(config.EVALS_DIR / "frames"))
    parser.add_argument("--expected", default=str(config.EVALS_DIR / "expected.json"))
    args = parser.parse_args()

    expected = {k: v for k, v in json.loads(Path(args.expected).read_text(encoding="utf-8")).items() if not k.startswith("_")}
    if not expected:
        print("No entries in", args.expected)
        return 2
    frames_dir = Path(args.frames)
    rows = []
    for i, (name, required) in enumerate(expected.items()):
        path = frames_dir / name
        if not path.exists():
            rows.append({"frame": name, "status": "MISSING", "missing": required, "description": ""})
            continue
        if i:
            time.sleep(args.sleep)
        try:
            with Image.open(path) as im:
                result = vision.describe(vision.encode_jpeg(im), "scene", [])
        except vision.QuotaExhausted as e:
            print(f"\nStopping: {e}")
            rows.append({"frame": name, "status": "ERROR", "missing": required, "description": str(e)})
            break
        except vision.VisionError as e:
            rows.append({"frame": name, "status": "ERROR", "missing": required, "description": str(e)})
            continue
        haystack = (result["description"] + " " + " ".join(result["objects"])).lower()
        missing = [r for r in required if not contains(haystack, r)]
        rows.append({"frame": name, "status": "PASS" if not missing else "FAIL", "missing": missing,
                     "description": result["description"], "latency_ms": result.get("latency_ms")})
        print(f"{rows[-1]['status']:5} {name}: {result['description']}")

    passed = sum(r["status"] == "PASS" for r in rows)
    total = len(expected)
    score = 100 * passed / total
    width = max(len(r["frame"]) for r in rows)
    print(f"\n{'frame'.ljust(width)}  result   missing objects")
    for r in rows:
        print(f"{r['frame'].ljust(width)}  {r['status']:7}  {', '.join(r['missing'])}")
    print(f"\nScore: {passed}/{total} frames = {score:.1f}%  (model {config.MODEL})")

    out = config.EVALS_DIR / "results.json"
    out.write_text(json.dumps({"model": config.MODEL, "score_percent": round(score, 1), "passed": passed,
                               "total": total, "frames": rows}, indent=2), encoding="utf-8")
    print("Details written to", out)
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
