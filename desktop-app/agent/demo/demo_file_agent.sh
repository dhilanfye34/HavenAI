#!/bin/bash
# ─────────────────────────────────────────────
# HavenAI Demo: File Agent Triggers
# Run while the desktop app is open and file monitoring is ON.
# Creates suspicious files in ~/Downloads that should trigger alerts.
# ─────────────────────────────────────────────
set -e

DEMO_DIR="$HOME/Downloads/havenai-demo"
mkdir -p "$DEMO_DIR"

echo "🔴 HavenAI File Agent Demo"
echo "   Creating suspicious files in ~/Downloads..."
echo ""

# --- Test 1: Suspicious executable extension ---
echo "[1/5] Dropping a fake .exe in Downloads..."
echo "This is a harmless test file" > "$HOME/Downloads/free_software_keygen.exe"
sleep 3

# --- Test 2: Double extension trick (document.pdf.exe) ---
echo "[2/5] Double extension trick: invoice.pdf.exe..."
echo "Harmless test" > "$HOME/Downloads/invoice.pdf.exe"
sleep 3

# --- Test 3: Suspicious .sh script ---
echo "[3/5] Suspicious shell script..."
echo "#!/bin/bash" > "$HOME/Downloads/system_patch.sh"
sleep 3

# --- Test 4: Suspicious keyword in filename ---
echo "[4/5] Suspicious filename with 'crack' keyword..."
echo "test" > "$HOME/Downloads/photoshop_crack_2026.dmg"
sleep 3

# --- Test 5: Batch file (Windows executable on Mac = phishing indicator) ---
echo "[5/5] Windows batch file on macOS..."
echo "@echo off" > "$HOME/Downloads/urgent_payment.bat"
sleep 3

echo ""
echo "✅ Done! Check the HavenAI dashboard for alerts."
echo ""
echo "To clean up:"
echo "  rm -f ~/Downloads/free_software_keygen.exe"
echo "  rm -f ~/Downloads/invoice.pdf.exe"
echo "  rm -f ~/Downloads/system_patch.sh"
echo "  rm -f ~/Downloads/photoshop_crack_2026.dmg"
echo "  rm -f ~/Downloads/urgent_payment.bat"
echo "  rm -rf ~/Downloads/havenai-demo"
