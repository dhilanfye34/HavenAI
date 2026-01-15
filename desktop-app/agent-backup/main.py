#!/usr/bin/env python3
"""
HavenAI Agent System - Main Entry Point

This script starts the HavenAI agent system. It can be run:
1. Directly for testing: python main.py
2. By Electron as a subprocess

The agent system communicates with Electron via stdin/stdout JSON messages.
"""

from havenai.agents.coordinator import main

if __name__ == "__main__":
    main()
