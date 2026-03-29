"""
File Agent

Monitors the file system for suspicious activity:
- New downloads (especially executables)
- File modifications
- Unusual file types

Uses the watchdog library for efficient file system monitoring.
"""

import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from queue import Queue
from threading import Lock
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent
import logging

from .base import Agent

logger = logging.getLogger(__name__)


# File extensions that are potentially dangerous — platform-aware.
import sys

if sys.platform == 'darwin':
    SUSPICIOUS_EXTENSIONS = {
        # macOS native executables and installers
        '.app', '.dmg', '.pkg', '.mpkg',
        # macOS scripts
        '.command', '.sh', '.workflow', '.action',
        '.scpt', '.scptd', '.applescript',
        # Cross-platform risks
        '.jar', '.js', '.py', '.rb', '.pl',
        # Windows executables (still suspicious if downloaded on Mac — may indicate phishing)
        '.exe', '.msi', '.bat', '.cmd', '.ps1', '.vbs', '.scr', '.pif',
    }
else:
    SUSPICIOUS_EXTENSIONS = {
        '.exe', '.msi', '.bat', '.cmd', '.ps1', '.vbs', '.js',
        '.scr', '.pif', '.jar', '.app', '.dmg', '.pkg',
    }

# File extensions that are commonly safe
SAFE_EXTENSIONS = {
    '.txt', '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif',
    '.mp3', '.mp4', '.mov', '.zip'
}

# Filenames and patterns to ignore (macOS system noise)
IGNORED_FILENAMES = {
    '.DS_Store', '.localized', 'Icon\r',
}

# Filename prefixes to ignore (macOS resource forks, temp files)
IGNORED_PREFIXES = ('._', '.com.apple.', '.Spotlight-')

# Extensions for partial/in-progress downloads that should be ignored
PARTIAL_DOWNLOAD_EXTENSIONS = {
    '.crdownload',  # Chrome
    '.part',        # Firefox
    '.download',    # Safari
    '.tmp',         # Various
    '.partial',     # Various
}


class FileEventHandler(FileSystemEventHandler):
    """Handles file system events from watchdog."""

    def __init__(self):
        self.events: List[Dict[str, Any]] = []
        self._lock = Lock()

    @staticmethod
    def _should_ignore(filepath: str) -> bool:
        """Return True if this file event is macOS system noise."""
        filename = Path(filepath).name
        if filename in IGNORED_FILENAMES:
            return True
        if any(filename.startswith(prefix) for prefix in IGNORED_PREFIXES):
            return True
        ext = Path(filepath).suffix.lower()
        if ext in PARTIAL_DOWNLOAD_EXTENSIONS:
            return True
        return False

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory and not self._should_ignore(event.src_path):
            with self._lock:
                self.events.append({
                    "type": "created",
                    "path": event.src_path,
                    "timestamp": time.time()
                })

    def on_modified(self, event: FileSystemEvent) -> None:
        if not event.is_directory and not self._should_ignore(event.src_path):
            with self._lock:
                self.events.append({
                    "type": "modified",
                    "path": event.src_path,
                    "timestamp": time.time()
                })

    def get_and_clear_events(self) -> List[Dict[str, Any]]:
        """Get all events and clear the list."""
        with self._lock:
            events = self.events.copy()
            self.events.clear()
        return events


class FileAgent(Agent):
    """
    Agent that monitors file system activity.
    
    Watches:
    - Downloads folder for new files
    - Desktop for new files
    - Any other configured directories
    
    Detects:
    - Suspicious executables
    - Unusual file types for this user
    - Files from unknown sources
    """
    
    def __init__(
        self, 
        shared_context: Dict[str, Any], 
        alert_queue: Queue,
        watch_paths: Optional[List[str]] = None,
        local_db=None
    ):
        super().__init__(shared_context, alert_queue, name="FileAgent", local_db=local_db)
        
        # Determine paths to watch
        if watch_paths:
            self.watch_paths = watch_paths
        else:
            # Default: watch Downloads and Desktop
            home = Path.home()
            self.watch_paths = [
                str(home / "Downloads"),
                str(home / "Desktop")
            ]
        
        # Set up file system observer
        self.event_handler = FileEventHandler()
        self.observer = Observer()
        
        # Start watching directories
        for path in self.watch_paths:
            if os.path.exists(path):
                self.observer.schedule(self.event_handler, path, recursive=False)
                logger.info(f"FileAgent watching: {path}")
            else:
                logger.warning(f"FileAgent: path does not exist: {path}")
        
        self.observer.start()
    
    @property
    def cycle_interval(self) -> float:
        """Check for new events every second."""
        return 1.0
    
    def perceive(self) -> Dict[str, Any]:
        """Get file system events since last cycle."""
        events = self.event_handler.get_and_clear_events()
        
        # Enrich events with file metadata
        enriched_events = []
        for event in events:
            path = event["path"]
            try:
                if os.path.exists(path):
                    stat = os.stat(path)
                    event["size"] = stat.st_size
                    event["extension"] = Path(path).suffix.lower()
                    event["filename"] = Path(path).name
                enriched_events.append(event)
            except OSError as e:
                logger.debug(f"Could not stat {path}: {e}")
        
        return {
            "events": enriched_events,
            "timestamp": time.time()
        }
    
    def analyze(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze file events for suspicious activity."""
        findings = []
        
        for event in observation["events"]:
            if event["type"] == "created":
                # Analyze new files
                risk_score, reasons = self._analyze_new_file(event)
                
                if risk_score > 0.5:  # Threshold for alerting
                    findings.append({
                        "event": event,
                        "risk_score": risk_score,
                        "reasons": reasons,
                        "recommendation": self._get_recommendation(risk_score, event)
                    })
        
        # Update shared context for other agents
        self.shared_context[self.name]["findings"] = findings
        self.shared_context[self.name]["recent_files"] = [
            e["path"] for e in observation["events"]
        ]
        recent_events = self.shared_context[self.name].get("recent_events", [])
        recent_events.extend(
            [
                {
                    "type": e.get("type"),
                    "path": e.get("path"),
                    "filename": e.get("filename"),
                    "extension": e.get("extension"),
                    "size": e.get("size"),
                    "timestamp": e.get("timestamp"),
                }
                for e in observation["events"]
            ]
        )
        self.shared_context[self.name]["recent_events"] = recent_events[-40:]
        self.shared_context[self.name]["event_count"] = len(observation["events"])
        self.shared_context[self.name]["total_event_count"] = (
            int(self.shared_context[self.name].get("total_event_count", 0))
            + len(observation["events"])
        )
        
        return {
            "findings": findings,
            "event_count": len(observation["events"]),
            "_current_events": [
                {
                    "type": e.get("type"),
                    "path": e.get("path"),
                    "filename": e.get("filename"),
                    "extension": e.get("extension"),
                    "size": e.get("size"),
                    "timestamp": e.get("timestamp"),
                }
                for e in observation["events"]
            ],
        }
    
    def act(self, analysis: Dict[str, Any]) -> None:
        """Send alerts for suspicious files."""
        for finding in analysis["findings"]:
            event = finding["event"]

            # Determine severity based on risk score
            risk = finding["risk_score"]
            if risk >= 0.9:
                severity = "critical"
            elif risk >= 0.7:
                severity = "high"
            elif risk >= 0.5:
                severity = "medium"
            else:
                severity = "low"

            self.send_alert({
                "type": "suspicious_download",
                "severity": severity,
                "title": f"Suspicious file detected: {event['filename']}",
                "description": f"A potentially dangerous file was downloaded to your computer.",
                "details": {
                    "filename": event["filename"],
                    "path": event["path"],
                    "extension": event.get("extension", "unknown"),
                    "size": event.get("size", 0),
                    "risk_score": finding["risk_score"],
                    "reasons": finding["reasons"],
                    "recommendation": finding["recommendation"]
                }
            })

        # Store only this cycle's events (not the accumulated recent_events list)
        for event_data in analysis.get("_current_events", []):
            self.store_event("file", event_data)
    
    def _analyze_new_file(self, event: Dict[str, Any]) -> tuple[float, List[str]]:
        """
        Analyze a new file and return risk score + reasons.
        
        Returns:
            (risk_score, reasons) tuple
        """
        risk = 0.0
        reasons = []
        
        extension = event.get("extension", "").lower()
        filename = event.get("filename", "")
        
        # Check 1: Is it an executable?
        if extension in SUSPICIOUS_EXTENSIONS:
            risk += 0.5
            reasons.append(f"Executable file type ({extension})")
        
        # Check 2: Is this file type unusual for this user?
        baseline_types = self.get_baseline("file_types", {})
        if baseline_types and extension:
            type_frequency = baseline_types.get(extension, 0)
            if type_frequency < 0.05:  # Less than 5% of usual downloads
                risk += 0.2
                reasons.append(f"Unusual file type for you ({extension})")
        
        # Check 3: Does filename look suspicious?
        suspicious_patterns = [
            'crack', 'keygen', 'patch', 'hack', 'cheat',
            'free_', 'invoice', 'payment', 'urgent'
        ]
        filename_lower = filename.lower()
        for pattern in suspicious_patterns:
            if pattern in filename_lower:
                risk += 0.2
                reasons.append(f"Suspicious keyword in filename: '{pattern}'")
                break
        
        # Check 4: Double extension trick (e.g., document.pdf.exe)
        if filename.count('.') > 1 and extension in SUSPICIOUS_EXTENSIONS:
            risk += 0.3
            reasons.append("File uses double extension trick")
        
        # Cap risk at 1.0
        risk = min(risk, 1.0)
        
        return risk, reasons
    
    def _get_recommendation(self, risk_score: float, event: Dict[str, Any]) -> str:
        """Generate a recommendation based on risk level."""
        if risk_score >= 0.8:
            return "Do NOT open this file. Consider deleting it immediately."
        elif risk_score >= 0.6:
            return "Be very careful with this file. Scan with antivirus before opening."
        elif risk_score >= 0.4:
            return "This file may be risky. Only open if you know the source."
        else:
            return "File appears relatively safe, but always be cautious."
    
    def stop(self) -> None:
        """Stop the file agent and observer."""
        self.observer.stop()
        self.observer.join()
        super().stop()
