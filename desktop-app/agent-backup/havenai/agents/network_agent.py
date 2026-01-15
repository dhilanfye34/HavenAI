"""
Network Agent

Monitors network connections for suspicious activity:
- Connections to unusual destinations
- Unusual ports
- Data exfiltration patterns
- Connections from suspicious processes

Uses psutil for cross-platform network monitoring.
"""

import time
from typing import Any, Dict, List, Set, Optional
from queue import Queue
import psutil
import socket
import logging

from .base import Agent

logger = logging.getLogger(__name__)


# Common legitimate ports
COMMON_PORTS = {
    80,    # HTTP
    443,   # HTTPS
    53,    # DNS
    22,    # SSH
    21,    # FTP
    25,    # SMTP
    587,   # SMTP (submission)
    993,   # IMAPS
    995,   # POP3S
    3389,  # RDP
}

# Suspicious ports often used by malware
SUSPICIOUS_PORTS = {
    4444,   # Metasploit default
    5555,   # Common backdoor
    6666,   # Common backdoor
    6667,   # IRC (used by botnets)
    31337,  # Elite/leet port
    12345,  # NetBus
    27374,  # SubSeven
}

# Known safe domains (partial list)
SAFE_DOMAINS = {
    'google.com', 'googleapis.com', 'gstatic.com',
    'microsoft.com', 'windows.com', 'office.com',
    'apple.com', 'icloud.com',
    'amazon.com', 'amazonaws.com',
    'github.com', 'githubusercontent.com',
    'cloudflare.com', 'cloudflare-dns.com'
}


class NetworkAgent(Agent):
    """
    Agent that monitors network connections.
    
    Watches:
    - Active network connections
    - Connection destinations (IPs and ports)
    - Which processes are making connections
    
    Detects:
    - Connections to suspicious IPs/ports
    - Unusual connection patterns
    - Potential data exfiltration
    """
    
    def __init__(self, shared_context: Dict[str, Any], alert_queue: Queue):
        super().__init__(shared_context, alert_queue, name="NetworkAgent")
        
        # Track connections we've already seen
        self.known_connections: Set[tuple] = set()
        
        # DNS cache for reverse lookups
        self.dns_cache: Dict[str, str] = {}
        
        # Error tracking (to avoid spamming logs)
        self._error_count = 0
    
    @property
    def cycle_interval(self) -> float:
        """Check network connections every 2 seconds."""
        return 2.0
    
    def perceive(self) -> Dict[str, Any]:
        """Observe current network connections."""
        connections = []
        new_connections = []
        current_conn_keys = set()
        
        try:
            # On macOS, we need to handle per-connection access denied errors
            for conn in psutil.net_connections(kind='inet'):
                try:
                    # Skip connections without remote address
                    if not conn.raddr:
                        continue
                    
                    # Create a unique key for this connection
                    conn_key = (
                        conn.laddr.port if conn.laddr else 0,
                        conn.raddr.ip if conn.raddr else '',
                        conn.raddr.port if conn.raddr else 0,
                        conn.pid or 0
                    )
                    current_conn_keys.add(conn_key)
                    
                    # Get process name for this connection
                    process_name = "unknown"
                    if conn.pid:
                        try:
                            process_name = psutil.Process(conn.pid).name()
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass
                    
                    conn_data = {
                        "local_port": conn.laddr.port if conn.laddr else None,
                        "remote_ip": conn.raddr.ip if conn.raddr else None,
                        "remote_port": conn.raddr.port if conn.raddr else None,
                        "status": conn.status,
                        "pid": conn.pid,
                        "process_name": process_name,
                        "hostname": self._reverse_dns(conn.raddr.ip) if conn.raddr else None
                    }
                    
                    connections.append(conn_data)
                    
                    # Check if this is a new connection
                    if conn_key not in self.known_connections:
                        new_connections.append(conn_data)
                
                except (psutil.AccessDenied, OSError):
                    # Skip connections we can't access (common on macOS)
                    continue
            
        except (psutil.AccessDenied, OSError) as e:
            # Only log if it's a complete failure, not per-connection issues
            if self._error_count < 3:
                logger.debug(f"Limited network access (this is normal on macOS): {e}")
                self._error_count += 1
        
        # Update known connections
        self.known_connections = current_conn_keys
        
        return {
            "connections": connections,
            "new_connections": new_connections,
            "total_count": len(connections),
            "timestamp": time.time()
        }
    
    def analyze(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze network connections for suspicious activity."""
        findings = []
        
        for conn in observation["new_connections"]:
            risk_score, reasons = self._analyze_connection(conn)
            
            if risk_score > 0.5:
                findings.append({
                    "connection": conn,
                    "risk_score": risk_score,
                    "reasons": reasons,
                    "recommendation": self._get_recommendation(risk_score, conn)
                })
        
        # Update shared context
        self.shared_context[self.name]["findings"] = findings
        self.shared_context[self.name]["connection_count"] = observation["total_count"]
        self.shared_context[self.name]["active_ips"] = list(set(
            c["remote_ip"] for c in observation["connections"] if c["remote_ip"]
        ))
        
        return {
            "findings": findings,
            "new_connection_count": len(observation["new_connections"])
        }
    
    def act(self, analysis: Dict[str, Any]) -> None:
        """Send alerts for suspicious connections."""
        for finding in analysis["findings"]:
            conn = finding["connection"]
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
            
            destination = conn.get("hostname") or conn["remote_ip"]
            
            self.send_alert({
                "type": "suspicious_network",
                "severity": severity,
                "title": f"Suspicious connection to {destination}",
                "description": f"A potentially dangerous network connection was detected.",
                "details": {
                    "remote_ip": conn["remote_ip"],
                    "remote_port": conn["remote_port"],
                    "hostname": conn.get("hostname"),
                    "process_name": conn["process_name"],
                    "pid": conn["pid"],
                    "risk_score": finding["risk_score"],
                    "reasons": finding["reasons"],
                    "recommendation": finding["recommendation"]
                }
            })
    
    def _analyze_connection(self, conn: Dict[str, Any]) -> tuple[float, List[str]]:
        """
        Analyze a network connection for suspicious indicators.
        
        Returns:
            (risk_score, reasons) tuple
        """
        risk = 0.0
        reasons = []
        
        remote_ip = conn.get("remote_ip", "")
        remote_port = conn.get("remote_port", 0)
        process_name = conn.get("process_name", "").lower()
        hostname = conn.get("hostname", "")
        
        # Check 1: Suspicious port
        if remote_port in SUSPICIOUS_PORTS:
            risk += 0.6
            reasons.append(f"Connection to suspicious port {remote_port}")
        elif remote_port not in COMMON_PORTS and remote_port > 1024:
            risk += 0.1
            reasons.append(f"Connection to uncommon port {remote_port}")
        
        # Check 2: Check against baseline hosts
        baseline_hosts = self.get_baseline("network_hosts", [])
        if baseline_hosts:
            # Check if IP or hostname is known
            is_known = (
                remote_ip in baseline_hosts or 
                hostname in baseline_hosts or
                any(hostname.endswith(h) for h in baseline_hosts if h)
            )
            if not is_known and len(baseline_hosts) > 5:
                risk += 0.3
                reasons.append(f"Connection to unfamiliar host: {hostname or remote_ip}")
        
        # Check 3: Process making unusual connections
        # e.g., notepad.exe shouldn't be making network connections
        non_network_processes = {'notepad', 'calculator', 'mspaint', 'wordpad'}
        if process_name in non_network_processes:
            risk += 0.5
            reasons.append(f"'{process_name}' should not be making network connections")
        
        # Check 4: Private IP ranges being contacted externally (potential C2)
        # This is unusual but not always malicious
        if remote_ip.startswith(('10.', '172.16.', '192.168.')):
            # Local network - generally safe
            risk = max(0, risk - 0.2)
        
        # Check 5: Check if connecting to safe domains
        if hostname:
            for safe_domain in SAFE_DOMAINS:
                if hostname.endswith(safe_domain):
                    risk = max(0, risk - 0.3)
                    break
        
        # Cap risk at 1.0
        risk = min(risk, 1.0)
        
        return risk, reasons
    
    def _reverse_dns(self, ip: str) -> Optional[str]:
        """Attempt reverse DNS lookup with caching."""
        if ip in self.dns_cache:
            return self.dns_cache[ip]
        
        try:
            hostname = socket.gethostbyaddr(ip)[0]
            self.dns_cache[ip] = hostname
            return hostname
        except (socket.herror, socket.gaierror, socket.timeout):
            self.dns_cache[ip] = None
            return None
    
    def _get_recommendation(self, risk_score: float, conn: Dict[str, Any]) -> str:
        """Generate a recommendation based on the connection analysis."""
        process_name = conn.get("process_name", "unknown")
        destination = conn.get("hostname") or conn["remote_ip"]
        
        if risk_score >= 0.8:
            return f"Consider blocking this connection. The process '{process_name}' is communicating with a suspicious destination."
        elif risk_score >= 0.6:
            return f"Investigate why '{process_name}' is connecting to '{destination}'. This may indicate malicious activity."
        elif risk_score >= 0.4:
            return f"Monitor this connection. Verify that '{process_name}' should be communicating with '{destination}'."
        else:
            return "This connection was flagged for your awareness but may be legitimate."