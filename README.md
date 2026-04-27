# HavenAI

AI-powered personal cybersecurity agent that learns your behavior and protects you from threats.

## Project Overview

HavenAI is a multi-agent AI system that monitors your computer for security threats. Unlike traditional antivirus that relies on signatures, HavenAI learns what's "normal" for you and alerts you when something unusual happens. It combines a native desktop application with a cloud-backed web dashboard, keeping raw telemetry private on-device while syncing only critical alerts to the cloud.

### Key Features

- **Multi-Agent Monitoring** — Five specialized agents (File, Process, Network, Email Inbox, Message/Notification) each watch a different surface of your system
- **Perceive-Analyze-Act Pattern** — Every agent continuously observes, scores risk, and acts on findings in autonomous loops
- **Correlated Threat Detection** — The Coordinator cross-references findings across agents (e.g., a downloaded file being immediately executed)
- **Local-First Storage** — All raw telemetry is stored in SQLite on-device with a 7-day rolling window; only medium+ severity alerts sync to the cloud
- **Email Inbox Monitoring** — Connects to your email via IMAP app passwords with auto-detected provider settings (Gmail, Outlook, Yahoo, iCloud) to scan for phishing
- **AI Chat Assistant** — Conversational security assistant with full context of all active agents, powered by OpenAI
- **Real-Time Dashboard** — Live file events, process spawns, network connections, health metrics, and alert feed
- **Notification Channels** — Email, SMS (Twilio), and automated voice call alerts based on configurable severity thresholds
- **Privacy-First** — IMAP and account credentials are encrypted on-device via the OS keychain (macOS Keychain / Windows DPAPI / libsecret); raw telemetry (file events, processes, connections) stays in local SQLite; only medium+ severity alerts (with the context needed to explain them) sync to the cloud
- **Modern UI** — Glassmorphism design system with WebGL shader backgrounds, built with Tailwind CSS and lucide-react

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLOUD                                      │
│                                                                      │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│   │   Web App    │   │   Backend    │   │   Database   │           │
│   │  (Next.js)   │   │  (FastAPI)   │   │ (PostgreSQL) │           │
│   │   Vercel     │   │   Render     │   │   Render     │           │
│   └──────────────┘   └──────────────┘   └──────────────┘           │
│         │                    │                  │                    │
│         │           Alerts, Auth, Devices       │                   │
│         │            medium+ severity           │                   │
└─────────┼────────────────────┼──────────────────┼───────────────────┘
          │              HTTPS │                   │
          │                    │                   │
┌─────────┼────────────────────┼───────────────────────────────────────┐
│         │          USER'S COMPUTER               │                   │
│         ▼                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                  HavenAI Desktop App (Electron)              │   │
│   │                                                              │   │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│   │   │  File    │ │ Process  │ │ Network  │ │ Email Inbox  │  │   │
│   │   │  Agent   │ │  Agent   │ │  Agent   │ │    Agent     │  │   │
│   │   └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │   │
│   │        │             │            │              │           │   │
│   │        ▼             ▼            ▼              ▼           │   │
│   │   ┌─────────────────────────────────────────────────────┐   │   │
│   │   │              Coordinator (Orchestrator)              │   │   │
│   │   │  - Correlates findings across agents                 │   │   │
│   │   │  - Writes to SQLite first, syncs medium+ to cloud   │   │   │
│   │   │  - Manages agent lifecycles                          │   │   │
│   │   └──────────────────────┬──────────────────────────────┘   │   │
│   │                          │                                   │   │
│   │                          ▼                                   │   │
│   │   ┌──────────────────────────────────────────────────────┐  │   │
│   │   │          SQLite (~/.havenai/havenai.db)               │  │   │
│   │   │   events | alerts | agent_snapshots | 7-day prune     │  │   │
│   │   └──────────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
HavenAI/
├── webapp/                          # Next.js web application (Vercel)
│   ├── app/
│   │   ├── page.tsx                 # Landing page with shader backgrounds
│   │   ├── about/                   # About page
│   │   ├── features/                # Features page
│   │   ├── download/                # Desktop app download page
│   │   ├── login/                   # Authentication page
│   │   ├── dashboard/               # Main command center
│   │   │   ├── page.tsx             # Dashboard with Overview/Runtime/Agents tabs
│   │   │   ├── components/          # TopBar, HealthScore, QuickStats, AlertFeed,
│   │   │   │                        # ChatPanel, RuntimeInspector, AgentPanel,
│   │   │   │                        # SetupPanel, ResourceMonitor, etc.
│   │   │   ├── hooks/               # useAlerts, useAgentStatus, useChat,
│   │   │   │                        # useSetupPreferences
│   │   │   └── services/            # Mock data providers (web fallback)
│   │   └── components/              # Shared: Navbar, Footer, shader backgrounds
│   │                                # (ShaderBackground, SmokeBackground,
│   │                                #  DottedSurface, WaveShader, etc.)
│   ├── tailwind.config.js
│   └── package.json
│
├── desktop-app/
│   ├── electron/                    # Electron shell
│   │   ├── src/
│   │   │   ├── main.ts              # Main process: window, tray, IPC handlers,
│   │   │   │                        # python-bridge, electron-store
│   │   │   └── preload.ts           # Context bridge API exposed to renderer
│   │   ├── renderer/                # Next.js static export for Electron
│   │   │   └── app/
│   │   │       ├── page.tsx          # Root (auth check -> dashboard)
│   │   │       ├── login/page.tsx    # Desktop login
│   │   │       └── globals.css       # Desktop design system
│   │   └── package.json
│   │
│   └── agent/                       # Python agent system
│       └── havenai/
│           ├── agents/
│           │   ├── base.py           # Abstract Agent with perceive/analyze/act
│           │   ├── coordinator.py    # Orchestrator, alert routing, cloud sync
│           │   ├── file_agent.py     # Watchdog-based file monitoring
│           │   ├── process_agent.py  # psutil process monitoring
│           │   ├── network_agent.py  # Network connection monitoring
│           │   ├── email_inbox_agent.py  # IMAP phishing detection
│           │   └── message_agent.py  # Notification channel router
│           ├── api/
│           │   └── client.py         # Backend API client (auth, alerts, heartbeat)
│           └── storage/
│               └── local_db.py       # SQLite local storage (events, alerts, prune)
│
├── backend/                         # FastAPI backend (Render)
│   ├── app/
│   │   ├── main.py                  # App entry, CORS, router registration
│   │   ├── config.py                # Environment configuration
│   │   ├── security.py              # JWT token handling
│   │   ├── schemas.py               # Pydantic request/response models
│   │   ├── dependencies.py          # Auth dependency injection
│   │   ├── db/
│   │   │   ├── database.py          # SQLAlchemy engine + session
│   │   │   └── models.py            # User, Device, Alert, UserSetupPreferences
│   │   ├── routers/
│   │   │   ├── auth.py              # Register, login, token refresh
│   │   │   ├── devices.py           # Device registration, heartbeat
│   │   │   ├── alerts.py            # Alert CRUD
│   │   │   ├── chat.py              # AI chat endpoint (OpenAI)
│   │   │   ├── setup.py             # User preferences (monitoring toggles, phones)
│   │   │   ├── downloads.py         # Desktop app download links
│   │   │   └── health.py            # Health check
│   │   └── services/
│   │       └── notifications.py     # SendGrid email, Twilio SMS/voice calls
│   ├── requirements.txt
│   └── tests/
│
├── .env                             # Root environment variables
└── README.md
```

## Tech Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Web Frontend | Next.js 14, Tailwind CSS, Three.js (shaders) | Vercel |
| Desktop App | Electron, Next.js (static export) | GitHub Releases (.dmg + .exe) |
| Agent System | Python 3, psutil, watchdog, imaplib | Runs locally |
| Local Storage | SQLite (via Python sqlite3) | `~/.havenai/havenai.db` |
| Backend API | FastAPI, SQLAlchemy, Pydantic | Render |
| Cloud Database | PostgreSQL | Render |
| Auth | JWT (access + refresh tokens) | — |
| Notifications | SendGrid (email), Twilio (SMS/voice) | — |
| AI Chat | OpenAI GPT API | — |
| IPC | Electron IPC + stdin/stdout JSON (Python bridge) | — |

## Agent System

Each agent follows the **perceive-analyze-act** pattern in its own thread:

| Agent | What it monitors | Key libraries |
|-------|-----------------|---------------|
| **FileAgent** | File creates/modifies in Downloads and Desktop | `watchdog` |
| **ProcessAgent** | New process spawns, suspicious parent-child chains | `psutil` |
| **NetworkAgent** | Active TCP connections, suspicious ports/destinations | `psutil`, `socket` |
| **EmailInboxAgent** | Unread emails for phishing indicators via IMAP | `imaplib` |
| **MessageAgent** | Routes alerts to configured notification channels | — |

The **Coordinator** runs the main loop, processes alerts from all agents, performs cross-agent correlation (e.g., downloaded file + immediate execution = critical threat), and manages data flow between local SQLite and the cloud backend.

## Data Storage Strategy

| Data | Where | Retention |
|------|-------|-----------|
| Raw file/process/network events | SQLite on device | 7-day rolling window |
| All alerts (any severity) | SQLite on device | 7-day rolling window |
| Medium/high/critical alerts | PostgreSQL (cloud) | Indefinite |
| User accounts, devices, preferences | PostgreSQL (cloud) | Indefinite |
| IMAP credentials | electron-store (device only) | Until user clears |
| Agent state snapshots | SQLite on device | 7-day rolling window |

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **PostgreSQL** (for backend, or use Render)

### Environment Variables

Create a `.env` in the project root:

```env
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/havenai
SECRET_KEY=your-jwt-secret
OPENAI_API_KEY=sk-...

# Notifications (optional)
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=alerts@yourdomain.com
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running Locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Web App:**
```bash
cd webapp
npm install
npm run dev
```

**Desktop App (development):**
```bash
cd desktop-app/electron
npm install
npm run dev
```

**Python Agents (standalone):**
```bash
cd desktop-app/agent
pip install -r requirements.txt
python -m havenai.agents.coordinator
```

### Packaging the Desktop App

```bash
cd desktop-app/electron
npm run package:mac
npm run package:win
npm run package:linux
# Output: release/HavenAI-0.1.0-arm64.dmg
# Output: release/HavenAI-Setup-0.1.0.exe
# Output: release/HavenAI-0.1.0.AppImage
```

For tagged releases, keep these versions aligned:
- `desktop-app/electron/package.json` (`version`)
- `backend/app/routers/downloads.py` (`APP_VERSION`)
- Git tag (`v<version>`)

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Web App | Vercel | Configured via `webapp/vercel.json` |
| Backend API | Render | Web service with `uvicorn app.main:app` |
| Database | Render | PostgreSQL (internal URL for backend) |
| Desktop App | GitHub Releases | `.dmg` (macOS), `.exe` (Windows), and `.AppImage` (Linux) uploaded per release |

## Team

- Jacob Ahrens — jxa1493@miami.edu
- Gianna Scuteri — grs124@miami.edu
- Dhilan Fye — dmf168@miami.edu

## License

This project is part of ECE 481/482 Senior Design at the University of Miami.
