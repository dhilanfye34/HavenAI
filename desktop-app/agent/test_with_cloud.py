#!/usr/bin/env python3
"""
Test script with cloud sync enabled.

This will:
1. Log in to your HavenAI account
2. Register this device
3. Start monitoring
4. Sync any alerts to your cloud backend

Run this to test cloud integration:
    cd desktop-app/agent
    pip install -r requirements.txt
    python test_with_cloud.py

Make sure your backend is running at localhost:8000!
"""

import time
import json
import sys
import platform
from queue import Queue, Empty

# Add parent directory to path for imports
sys.path.insert(0, '.')

from havenai.agents import FileAgent, ProcessAgent, NetworkAgent
from havenai.api import get_client


def main():
    print("=" * 60)
    print("HavenAI Agent Test (with Cloud Sync)")
    print("=" * 60)
    print()
    
    # Get API client
    api = get_client()
    
    # Check if already logged in
    if api.is_authenticated():
        print(f"✓ Already logged in (device: {api.device_id[:8]}...)")
    else:
        print("Not logged in. Let's set that up.")
        print()
        
        # Get credentials
        email = input("Email: ").strip()
        password = input("Password: ").strip()
        
        # Try to login
        try:
            api.login(email, password)
            print(f"✓ Logged in as {email}")
        except Exception as e:
            print(f"✗ Login failed: {e}")
            print()
            print("Make sure your backend is running and the account exists.")
            print("Try: POST /auth/register at http://localhost:8000/docs")
            return
        
        # Register this device
        print()
        device_name = input("Device name (e.g., 'MacBook Pro'): ").strip() or "My Computer"
        
        try:
            os_type = platform.system().lower()
            if os_type == "darwin":
                os_type = "macos"
            
            api.register_device(
                name=device_name,
                os_type=os_type,
                os_version=platform.release(),
                app_version="0.1.0"
            )
            print(f"✓ Device registered: {device_name}")
        except Exception as e:
            print(f"✗ Device registration failed: {e}")
            return
    
    print()
    print("=" * 60)
    print("Starting agents with cloud sync enabled...")
    print("Alerts will appear both here AND in your web dashboard!")
    print("Press Ctrl+C to stop.")
    print("=" * 60)
    print()
    
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
                
                # Sync to cloud
                if api.is_authenticated():
                    try:
                        result = api.send_alert(alert)
                        if result:
                            print(f"   ☁️  Synced to cloud (ID: {result['id'][:8]}...)")
                        else:
                            print(f"   ⚠️  Failed to sync to cloud")
                    except Exception as e:
                        print(f"   ⚠️  Cloud sync error: {e}")
                
                if 'details' in alert:
                    print(f"   Details: {json.dumps(alert['details'], indent=6)}")
                print("-" * 60)
                
            except Empty:
                pass
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print()
        print("Stopping agents...")
        for agent in agents:
            agent.stop()
        print("Done!")
        print()
        print(f"Check your alerts at: http://localhost:8000/docs#/Alerts/list_alerts_alerts_get")


if __name__ == "__main__":
    main()
