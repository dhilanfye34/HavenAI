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
# Build for current platform
npm run package

# Build for specific platform
npm run package:mac
npm run package:win
npm run package:linux
```

Built apps will be in the `release/` directory.

## Icons

Before building, add icons to the `assets/` directory:
- `icon.png` - 512x512 PNG for Linux
- `icon.icns` - Mac icon bundle
- `icon.ico` - Windows icon
- `tray.png` - 16x16 or 32x32 tray icon
- `trayTemplate.png` - Mac tray icon (template for dark/light mode)

You can generate these from a single PNG using tools like:
- https://www.electron.build/icons
- `electron-icon-maker` npm package
