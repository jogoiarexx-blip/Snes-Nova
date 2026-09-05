#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
for f in assets/js/app.js assets/js/advanced.js assets/js/v090.js assets/js/v091.js assets/js/modules/*.js sw.js; do node --check "$f"; done
python3 - <<'PY2'
import json, pathlib, zipfile
r=pathlib.Path('.')
for p in [r/'manifest.webmanifest',r/'data/compatibility.json',r/'data/top-games.json',r/'vendor/emulatorjs/runtime-lock.json']:
 json.loads(p.read_text(encoding='utf-8'))
assert (r/'games/doom-1995.sfc').stat().st_size==2097152
assert (r/'games/final-fight.sfc').stat().st_size==1048576
print('smoke ok')
PY2
