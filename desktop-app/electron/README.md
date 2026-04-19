# HavenAI Desktop Application

Electron desktop app that wraps the Python agents with a native UI.

## Structure

```
electron/
├── src/                    # Main process (TypeScript)
│   ├── main.ts             # App entry point, window management
│   ├── python-bridge.ts    # Spawns and communicates with Python
│   └── preload.ts          # Secure IPC bridge to renderer
├── renderer/               # UI (Next.js)
│   └── app/
│       └── page.tsx        # Main UI
├── assets/                 # Icons for app and tray
└── package.json            # Build configuration
```

## Prerequisites

- Node.js 18+
- Python 3.10+
- The Python agent (`../agent/`) with dependencies installed

## Development Setup

```bash
# 1. Install Electron dependencies
npm install

# 2. Install renderer dependencies
cd renderer
npm install
cd ..

# 3. Make sure Python agent has dependencies
cd ../agent
pip install -r requirements.txt
cd ../electron

# 4. Run in development mode
npm run dev
```

This will:
- Start the Next.js dev server on port 3001
- Start Electron loading from localhost:3001
- Spawn the Python agent

## Building for Distribution

```bash
# Build the bundled Python agent for this OS
npm run build:agent

# Build for current platform
npm run package

# Build for specific platform
npm run package:mac
npm run package:win
npm run package:linux
```

Built apps will be in the `release/` directory.

Windows NSIS installers are produced as:
- `release/HavenAI-Setup-<version>.exe`
Linux desktop artifacts include:
- `release/HavenAI-<version>.AppImage`

## Uninstall Cleanup

HavenAI now ships uninstall cleanup scripts that:
- Stop running `havenai-agent` / `HavenAI` processes.
- Remove local agent/app data (`~/.havenai` and Electron user-data folders).

Platform behavior:
- **Windows NSIS:** cleanup runs automatically during uninstall via NSIS hook.
- **Linux deb:** cleanup runs automatically on package removal via `afterRemove`.
- **Linux AppImage / macOS dmg:** no native uninstall hook exists, so run the bundled helper manually before deleting the app:
  - macOS: `bash "/Applications/HavenAI.app/Contents/Resources/uninstall/uninstall-havenai.sh"`
  - Linux (installed package path): `bash "/opt/HavenAI/resources/uninstall/uninstall-havenai.sh"`

## Icons

Before building, add icons to the `assets/` directory:
- `icon.png` - 512x512 PNG for Linux
- `icon.icns` - Mac icon bundle
- `icon.ico` - Optional Windows icon (app falls back to `icon.png` if missing)
- `tray.png` - 16x16 or 32x32 tray icon
- `trayTemplate.png` - Mac tray icon (template for dark/light mode)

To regenerate icon assets from the ShieldLock source icon:

```bash
python create-icons.py
```

## Release Automation

Windows releases are automated by `.github/workflows/release-windows.yml`:

- Trigger: push a version tag like `v0.1.4`
- Runner: `windows-latest`
- Output: uploads `HavenAI-Setup-<version>.exe` and updater metadata to the matching GitHub Release

Linux releases are automated by `.github/workflows/release-linux.yml`:

- Trigger: push a version tag like `v0.1.4`
- Runner: `ubuntu-latest`
- Output: uploads `HavenAI-<version>.AppImage` and Linux updater metadata to the matching GitHub Release

Versioning rule for releases:
- Keep `desktop-app/electron/package.json` version, `backend/app/routers/downloads.py` `APP_VERSION`, and the Git tag `v<version>` in sync.
