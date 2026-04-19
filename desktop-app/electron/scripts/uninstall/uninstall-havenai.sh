#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

"$SCRIPT_DIR/cleanup-unix.sh"

echo "HavenAI agent processes and local data have been cleaned up."
echo "You can now remove the HavenAI app bundle/AppImage file if desired."
