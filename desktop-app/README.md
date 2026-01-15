# HavenAI Desktop Application

The desktop application is the core of HavenAI. It runs locally on the user's machine and contains the AI agent system.

## Architecture

```
desktop-app/
├── electron/           # Electron shell (creates window, system tray)
│   ├── main.ts         # Main process - window management
│   ├── preload.ts      # Bridge between main and renderer
│   └── renderer/       # React UI
│
└── agent/              # Python agent system
    ├── main.py         # Entry point
    └── agents/         # Individual agent implementations
```

## How It Works

1. **Electron** creates the application window and system tray icon
2. **Electron** spawns the **Python** agent process
3. **Python agents** run autonomously, monitoring the system
4. When a threat is detected, Python sends a JSON message to Electron
5. **Electron** shows a notification and updates the UI

## Prerequisites

- Node.js 18+
- Python 3.10+
- npm or yarn

## Setup

```bash
# Install Electron dependencies
npm install

# Install Python dependencies
cd agent
pip install -r requirements.txt
```

## Development

```bash
# Run in development mode
npm run dev
```

## Building

```bash
# Build installers for all platforms
npm run build
```

This creates:
- `dist/HavenAI-Setup.exe` (Windows)
- `dist/HavenAI.dmg` (macOS)
- `dist/HavenAI.AppImage` (Linux)
