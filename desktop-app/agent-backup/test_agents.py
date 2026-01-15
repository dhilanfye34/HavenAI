#!/usr/bin/env python3
"""
Simple test script to verify the agent system works.

Run this to see the agents in action:
    cd desktop-app/agent
    pip install -r requirements.txt
    python test_agents.py

This will start all agents and print alerts to the console.
Try downloading a file or starting a new program to see alerts!
"""

import time
import json
from queue import Queue, Empty

# Add parent directory to path for imports
import sys
sys.path.insert(0, '.')

from havenai.agents import FileAgent, ProcessAgent, NetworkAgent


def main():
    print("=" * 60)
    print("HavenAI Agent Test")
    print("=" * 60)
    print()
    print("This will start all agents and monitor your system.")
    print("Try:")
    print("  - Downloading a file")
    print("  - Opening a new application")
    print("  - Making network connections")
    print()
    print("Press Ctrl+C to stop.")
    print()
    print("=" * 60)
    
    # Shared context and alert queue
    shared_context = {
        "baseline": {
            "file_types": {".pdf": 0.3, ".docx": 0.2, ".jpg": 0.2},
            "network_hosts": ["google.com", "github.com"],
            "process_names": ["chrome", "code", "python"]
        }
    }
    alert_queue = Queue()
    
    # Create agents
    agents = [
        FileAgent(shared_context, alert_queue),
        ProcessAgent(shared_context, alert_queue),
        NetworkAgent(shared_context, alert_queue),
    ]
    
    # Start agents
    print("Starting agents...")
    for agent in agents:
        agent.start()
        print(f"  ✓ {agent.name} started")
    
    print()
    print("Agents running. Watching for suspicious activity...")
    print("-" * 60)
    
    try:
        while True:
            # Check for alerts
            try:
                alert = alert_queue.get_nowait()
                print()
                print("🚨 ALERT DETECTED!")
                print(f"   Type: {alert.get('type')}")
                print(f"   Severity: {alert.get('severity')}")
                print(f"   Title: {alert.get('title')}")
                print(f"   Agent: {alert.get('agent')}")
                if 'details' in alert:
                    print(f"   Details: {json.dumps(alert['details'], indent=6)}")
                print("-" * 60)
            except Empty:
                pass
            
            # Print status every 10 seconds
            time.sleep(1)
            
    except KeyboardInterrupt:
        print()
        print("Stopping agents...")
        for agent in agents:
            agent.stop()
        print("Done!")


if __name__ == "__main__":
    main()
