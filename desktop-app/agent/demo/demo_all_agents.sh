#!/bin/bash
# ─────────────────────────────────────────────
# HavenAI Demo: Trigger ALL Desktop Agents
# Run while the desktop app is open with all monitors ON.
# Fires file, process, and network alerts in sequence.
# ─────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔══════════════════════════════════════════╗"
echo "║       HavenAI — Full Agent Demo          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Make sure the desktop app is running with"
echo "file, process, and network monitoring ON."
echo ""
read -p "Press Enter to start..."
echo ""

echo "━━━ FILE AGENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/demo_file_agent.sh"
echo ""

echo "━━━ PROCESS AGENT ━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/demo_process_agent.sh"
echo ""

echo "━━━ NETWORK AGENT ━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/demo_network_agent.sh"
echo ""

echo "╔══════════════════════════════════════════╗"
echo "║  All demos complete! Check the dashboard ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Cleanup: rm -f ~/Downloads/free_software_keygen.exe ~/Downloads/invoice.pdf.exe ~/Downloads/system_patch.sh ~/Downloads/photoshop_crack_2026.dmg ~/Downloads/urgent_payment.bat"
