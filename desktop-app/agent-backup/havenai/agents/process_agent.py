"""
Process Agent

Monitors running processes for suspicious activity:
- Unusual process spawns
- Suspicious parent-child relationships
- Processes with unusual resource usage
- Known malicious process names

Uses psutil for cross-platform process monitoring.
"""

import time
from typing import Any, Dict, List, Set, Optional
from queue import Queue
import psutil
import logging

from .base import Agent

logger = logging.getLogger(__name__)


# Processes that are known to be commonly abused
SUSPICIOUS_PROCESS_NAMES = {
    'powershell', 'cmd', 'wscript', 'cscript', 'mshta',
    'regsvr32', 'rundll32', 'certutil', 'bitsadmin'
}

# Normal system processes (shouldn't alert on these spawning)
SYSTEM_PROCESSES = {
    'system', 'registry', 'smss', 'csrss', 'wininit',
    'services', 'lsass', 'svchost', 'explorer', 'dwm',
    'kernel_task', 'launchd', 'WindowServer'  # macOS
}


class ProcessAgent(Agent):
    """
    Agent that monitors running processes.
    
    Watches:
    - New process spawns
    - Process parent-child relationships
    - Resource usage anomalies
    
    Detects:
    - Suspicious process chains (e.g., Word spawning PowerShell)
    - Unknown processes
    - Processes with unusual behavior
    """
    
    def __init__(self, shared_context: Dict[str, Any], alert_queue: Queue):
        super().__init__(shared_context, alert_queue, name="ProcessAgent")
        
        # Track known processes to detect new ones
        self.known_pids: Set[int] = set()
        self.process_history: Dict[int, Dict[str, Any]] = {}
        
        # Initialize with current processes
        self._update_known_processes()
    
    @property
    def cycle_interval(self) -> float:
        """Check for new processes every second."""
        return 1.0
    
    def _update_known_processes(self) -> None:
        """Update the set of known process IDs."""
        current_pids = set()
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                current_pids.add(proc.info['pid'])
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        self.known_pids = current_pids
    
    def perceive(self) -> Dict[str, Any]:
        """Observe running processes and detect new ones."""
        current_processes = []
        new_processes = []
        current_pids = set()
        
        for proc in psutil.process_iter(['pid', 'name', 'ppid', 'create_time']):
            try:
                pinfo = proc.info
                current_pids.add(pinfo['pid'])
                
                # Get additional info for process
                proc_data = {
                    "pid": pinfo['pid'],
                    "name": pinfo['name'],
                    "ppid": pinfo['ppid'],
                    "create_time": pinfo['create_time']
                }
                
                # Try to get parent name
                try:
                    parent = psutil.Process(pinfo['ppid'])
                    proc_data["parent_name"] = parent.name()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    proc_data["parent_name"] = "unknown"
                
                current_processes.append(proc_data)
                
                # Check if this is a new process
                if pinfo['pid'] not in self.known_pids:
                    new_processes.append(proc_data)
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Update known PIDs for next cycle
        self.known_pids = current_pids
        
        return {
            "current_processes": current_processes,
            "new_processes": new_processes,
            "total_count": len(current_processes),
            "timestamp": time.time()
        }
    
    def analyze(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze processes for suspicious activity."""
        findings = []
        
        for proc in observation["new_processes"]:
            risk_score, reasons = self._analyze_process(proc)
            
            if risk_score > 0.5:
                findings.append({
                    "process": proc,
                    "risk_score": risk_score,
                    "reasons": reasons,
                    "recommendation": self._get_recommendation(risk_score, proc)
                })
        
        # Update shared context
        self.shared_context[self.name]["findings"] = findings
        self.shared_context[self.name]["process_count"] = observation["total_count"]
        self.shared_context[self.name]["recent_spawns"] = [
            p["name"] for p in observation["new_processes"]
        ]
        
        return {
            "findings": findings,
            "new_process_count": len(observation["new_processes"])
        }
    
    def act(self, analysis: Dict[str, Any]) -> None:
        """Send alerts for suspicious processes."""
        for finding in analysis["findings"]:
            proc = finding["process"]
            risk = finding["risk_score"]
            
            # Determine severity
            if risk >= 0.9:
                severity = "critical"
            elif risk >= 0.7:
                severity = "high"
            elif risk >= 0.5:
                severity = "medium"
            else:
                severity = "low"
            
            self.send_alert({
                "type": "suspicious_process",
                "severity": severity,
                "title": f"Suspicious process detected: {proc['name']}",
                "description": f"A potentially dangerous process was started on your computer.",
                "details": {
                    "process_name": proc["name"],
                    "pid": proc["pid"],
                    "parent_name": proc.get("parent_name", "unknown"),
                    "parent_pid": proc["ppid"],
                    "risk_score": finding["risk_score"],
                    "reasons": finding["reasons"],
                    "recommendation": finding["recommendation"]
                }
            })
    
    def _analyze_process(self, proc: Dict[str, Any]) -> tuple[float, List[str]]:
        """
        Analyze a process for suspicious indicators.
        
        Returns:
            (risk_score, reasons) tuple
        """
        risk = 0.0
        reasons = []
        
        name = proc["name"].lower() if proc["name"] else ""
        parent_name = proc.get("parent_name", "").lower()
        
        # Check 1: Is this a commonly abused process?
        if name in SUSPICIOUS_PROCESS_NAMES:
            risk += 0.3
            reasons.append(f"'{name}' is commonly used in attacks")
        
        # Check 2: Suspicious parent-child relationship
        # e.g., Word/Excel spawning cmd/powershell is suspicious
        office_apps = {'winword', 'excel', 'powerpnt', 'outlook', 'word', 'microsoft word'}
        shell_processes = {'cmd', 'powershell', 'bash', 'sh', 'wscript', 'cscript'}
        
        if parent_name in office_apps and name in shell_processes:
            risk += 0.5
            reasons.append(f"Office app ({parent_name}) spawned shell ({name})")
        
        # Check 3: Browser spawning suspicious process
        browsers = {'chrome', 'firefox', 'msedge', 'safari', 'opera'}
        if parent_name in browsers and name in shell_processes:
            risk += 0.4
            reasons.append(f"Browser ({parent_name}) spawned shell ({name})")
        
        # Check 4: Is this process in user's baseline?
        baseline_processes = self.get_baseline("process_names", [])
        if baseline_processes and name and name not in baseline_processes:
            # Only flag if we have a baseline and this is truly new
            if len(baseline_processes) > 10:  # Need enough baseline data
                risk += 0.2
                reasons.append(f"Process '{name}' not in your normal activity")
        
        # Check 5: Process name obfuscation (random-looking names)
        if name and len(name) > 8:
            consonants = sum(1 for c in name if c.lower() in 'bcdfghjklmnpqrstvwxyz')
            if consonants / len(name) > 0.7:
                risk += 0.2
                reasons.append("Process name appears randomly generated")
        
        # Cap risk at 1.0
        risk = min(risk, 1.0)
        
        return risk, reasons
    
    def _get_recommendation(self, risk_score: float, proc: Dict[str, Any]) -> str:
        """Generate a recommendation based on the process analysis."""
        if risk_score >= 0.8:
            return f"Consider terminating '{proc['name']}' immediately. This process shows signs of malicious activity."
        elif risk_score >= 0.6:
            return f"Monitor '{proc['name']}' closely. Check if you intentionally started this process."
        elif risk_score >= 0.4:
            return f"'{proc['name']}' may be legitimate but warrants attention. Verify its source."
        else:
            return "This process appears relatively normal but was flagged for your awareness."
