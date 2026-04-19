#!/usr/bin/env bash
#
# Bundle the HavenAI agent into a single self-contained binary using PyInstaller.
# Output: dist/havenai-agent (macOS/Linux) or dist/havenai-agent.exe (Windows)
#
# This is the binary that gets shipped inside the Electron .dmg so users don't
# need Python installed on their machine.

set -euo pipefail

cd "$(dirname "$0")"

# Use the venv's Python explicitly so we pick up the right site-packages.
PYTHON="venv/bin/python"
if [ ! -x "$PYTHON" ]; then
  echo "ERROR: venv/bin/python not found. Create the venv first." >&2
  exit 1
fi

rm -rf build dist

"$PYTHON" -m PyInstaller --clean --noconfirm havenai-agent.spec

echo ""
if [ -f "dist/havenai-agent" ]; then
  echo "Built: $(pwd)/dist/havenai-agent"
  ls -lh dist/havenai-agent
elif [ -f "dist/havenai-agent.exe" ]; then
  echo "Built: $(pwd)/dist/havenai-agent.exe"
  ls -lh dist/havenai-agent.exe
else
  echo "ERROR: PyInstaller finished but no agent binary was found in dist/." >&2
  exit 1
fi
