#!/usr/bin/env bash
#
# Bundle the HavenAI agent into a single self-contained binary using PyInstaller.
# Output: dist/havenai-agent (macOS/Linux) or dist/havenai-agent.exe (Windows)
#
# This is the binary that gets shipped inside the Electron .dmg so users don't
# need Python installed on their machine.

set -euo pipefail

cd "$(dirname "$0")"

# Use the venv's PyInstaller explicitly so we pick up the right site-packages
PYI="venv/bin/pyinstaller"
if [ ! -x "$PYI" ]; then
  echo "ERROR: venv/bin/pyinstaller not found. Run: venv/bin/pip install pyinstaller" >&2
  exit 1
fi

rm -rf build dist

"$PYI" \
  --onefile \
  --name havenai-agent \
  --clean \
  --noconfirm \
  --hidden-import httpx \
  --hidden-import psutil \
  --hidden-import watchdog \
  --hidden-import watchdog.observers \
  --hidden-import watchdog.events \
  --hidden-import watchdog.observers.fsevents \
  --collect-submodules havenai \
  main.py

echo ""
echo "Built: $(pwd)/dist/havenai-agent"
ls -lh dist/havenai-agent
