# HavenAI

AI-powered personal cybersecurity agent that learns your behavior and protects you from threats.

## Project Overview

HavenAI is a multi-agent AI system that monitors your computer for security threats. Unlike traditional antivirus that relies on signatures, HavenAI learns what's "normal" for YOU and alerts you when something unusual happens.

### Key Features

- **Personalized Protection**: Learns your normal behavior patterns
- **Real-time Monitoring**: File downloads, network connections, running processes
- **Multi-Agent Architecture**: Specialized agents that work together
- **Privacy-First**: All analysis happens locally on your device
- **Plain English Alerts**: Explains threats in terms you can understand

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUD                                   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │   Website   │  │   Backend   │  │  Database   │            │
│   │  (Next.js)  │  │  (FastAPI)  │  │ (PostgreSQL)│            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S COMPUTER                              │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                  HavenAI Desktop App                     │  │
│   │                                                          │  │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│   │   │   File   │  │ Network  │  │ Process  │   Agents     │  │
│   │   │  Agent   │  │  Agent   │  │  Agent   │              │  │
│   │   └──────────┘  └──────────┘  └──────────┘              │  │
│   │                      │                                   │  │
│   │              ┌───────┴───────┐                          │  │
│   │              │  Coordinator  │                          │  │
│   │              └───────────────┘                          │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
havenai/
├── desktop-app/          # Electron + Python desktop application
│   ├── electron/         # Electron main process and React UI
│   └── agent/            # Python agent system
├── backend/              # FastAPI backend API
└── webapp/               # Next.js website and dashboard
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Desktop UI | Electron + React |
| Agent Core | Python |
| Backend API | FastAPI |
| Database | PostgreSQL |
| Web Dashboard | Next.js |
| Hosting | Railway |

## Team

- Jacob Ahrens - jxa1493@miami.edu
- Gianna Scuteri - grs124@miami.edu  
- Dhilan Fye - dmf168@miami.edu

## Getting Started

See individual README files in each subdirectory for setup instructions.

## License

This project is part of ECE 481/482 Senior Design at University of Miami.
