#!/usr/bin/env python3
"""
Demo script to trigger HavenAI alerts.

Run test_agents.py first in one terminal, then run this in another:
    python trigger_demo.py

This will create test files that should trigger alerts.
"""

import os
import time
from pathlib import Path

def main():
    print("=" * 60)
    print("HavenAI Alert Trigger Demo")
    print("=" * 60)
    print()
    print("Make sure test_agents.py is running in another terminal!")
    print()
    
    downloads = Path.home() / "Downloads"
    
    if not downloads.exists():
        print(f"Downloads folder not found at {downloads}")
        print("Creating test file in current directory instead...")
        downloads = Path(".")
    
    print("Triggering alerts in 3 seconds...")
    time.sleep(3)
    
    # Test 1: Create a suspicious .exe file (empty, just for testing)
    print()
    print("1. Creating suspicious executable file...")
    test_file = downloads / "free_game_crack.exe"
    test_file.write_text("This is a test file, not a real executable")
    print(f"   Created: {test_file}")
    print("   → This should trigger a HIGH severity alert!")
    
    time.sleep(2)
    
    # Test 2: Create a file with double extension
    print()
    print("2. Creating file with double extension trick...")
    test_file2 = downloads / "invoice.pdf.exe"
    test_file2.write_text("Test file with double extension")
    print(f"   Created: {test_file2}")
    print("   → This should trigger a CRITICAL severity alert!")
    
    time.sleep(2)
    
    # Test 3: Create a normal-looking file
    print()
    print("3. Creating normal PDF file...")
    test_file3 = downloads / "meeting_notes.pdf"
    test_file3.write_text("Normal looking file")
    print(f"   Created: {test_file3}")
    print("   → This should NOT trigger an alert (normal file type)")
    
    time.sleep(2)
    
    print()
    print("=" * 60)
    print("Check the other terminal for alerts!")
    print("=" * 60)
    print()
    
    # Cleanup
    input("Press Enter to clean up test files...")
    
    for f in [test_file, test_file2, test_file3]:
        if f.exists():
            f.unlink()
            print(f"Deleted: {f}")
    
    print()
    print("Done! Test files cleaned up.")


if __name__ == "__main__":
    main()