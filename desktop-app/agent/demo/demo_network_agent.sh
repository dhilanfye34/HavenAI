#!/bin/bash
# ─────────────────────────────────────────────
# HavenAI Demo: Network Agent Triggers
# Run while the desktop app is open and network monitoring is ON.
# Attempts outbound connections to suspicious ports on a non-routable
# external IP (192.0.2.1 — RFC 5737 TEST-NET, goes nowhere).
# The agent sees the outbound SYN attempt before it times out.
# ─────────────────────────────────────────────
set -e

# RFC 5737 TEST-NET-1 — guaranteed non-routable, won't reach any real host.
TARGET="192.0.2.1"

echo "🔴 HavenAI Network Agent Demo"
echo "   Making suspicious outbound connections to $TARGET..."
echo "   (connections will time out — that's expected)"
echo ""

# --- Test 1: Port 4444 — Metasploit default ---
echo "[1/4] Connecting to port 4444 (Metasploit default)..."
nc -w 3 $TARGET 4444 </dev/null 2>/dev/null &
sleep 2

# --- Test 2: Port 6667 — IRC (botnet C2) ---
echo "[2/4] Connecting to port 6667 (IRC / botnet C2)..."
nc -w 3 $TARGET 6667 </dev/null 2>/dev/null &
sleep 2

# --- Test 3: Port 31337 — Elite/leet port ---
echo "[3/4] Connecting to port 31337 (leet backdoor port)..."
nc -w 3 $TARGET 31337 </dev/null 2>/dev/null &
sleep 2

# --- Test 4: Port 5555 — Common backdoor ---
echo "[4/4] Connecting to port 5555 (common backdoor)..."
nc -w 3 $TARGET 5555 </dev/null 2>/dev/null &
sleep 2

echo ""
echo "⏳ Waiting for connections to time out..."
wait 2>/dev/null || true

echo ""
echo "✅ Done! Check the HavenAI dashboard for network alerts."
echo "   All connections went to a non-routable test IP — nothing to clean up."
