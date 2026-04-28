#!/bin/bash
# ─────────────────────────────────────────────
# HavenAI Demo: Process Agent Trigger
# Run while the desktop app is open and process monitoring is ON.
# Spawns openssl (flagged as suspicious — used for encrypted C2 tunnels).
# ─────────────────────────────────────────────
set -e

echo "🔴 HavenAI Process Agent Demo"
echo "   Spawning openssl (flagged as suspicious)..."
echo ""

openssl dhparam -out /dev/null 2048 2>/dev/null &
OPENSSL_PID=$!

echo "⏳ openssl running (PID $OPENSSL_PID). Check Apps & Privacy now!"
echo "   Press Enter when done to clean up..."

read -r || true

kill $OPENSSL_PID 2>/dev/null || true
wait 2>/dev/null || true
echo "✅ Done!"
