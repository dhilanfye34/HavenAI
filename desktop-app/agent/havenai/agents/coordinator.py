"""
Coordinator Agent

The master orchestrator that:
- Starts and manages all other agents
- Maintains the shared context
- Correlates findings across agents
- Decides final alert severity
- Communicates with Electron UI

This is the entry point for the agent system.
"""

import time
import json
import sys
from typing import Any, Dict, List, Optional
from queue import Queue, Empty
from threading import Thread
import logging

from .base import Agent
from .file_agent import FileAgent
from .process_agent import ProcessAgent
from .network_agent import NetworkAgent

logger = logging.getLogger(__name__)


class Coordinator:
    """
    Master coordinator for the HavenAI agent system.
    
    Responsibilities:
    - Initialize and manage all agents
    - Maintain shared context for inter-agent communication
    - Process and correlate alerts from all agents
    - Communicate with Electron via stdin/stdout JSON messages
    """
    
    def __init__(self):
        # Shared context - all agents can read/write to this
        self.shared_context: Dict[str, Any] = {
            "baseline": {
                "file_types": {},
                "network_hosts": [],
                "process_names": []
            }
        }
        
        # Alert queue - agents send alerts here
        self.alert_queue: Queue = Queue()
        
        # Initialize agents
        self.agents: List[Agent] = []
        self.running = False
        
        # For communicating with Electron
        self.outgoing_queue: Queue = Queue()
    
    def initialize_agents(self) -> None:
        """Create all agent instances."""
        logger.info("Initializing agents...")
        
        # Create each agent with shared context and alert queue
        self.agents = [
            FileAgent(self.shared_context, self.alert_queue),
            ProcessAgent(self.shared_context, self.alert_queue),
            NetworkAgent(self.shared_context, self.alert_queue),
        ]
        
        logger.info(f"Initialized {len(self.agents)} agents")
    
    def start(self) -> None:
        """Start all agents and the coordinator loop."""
        logger.info("Starting HavenAI agent system...")
        
        self.running = True
        
        # Start all agents
        for agent in self.agents:
            agent.start()
            logger.info(f"  ✓ {agent.name} started")
        
        # Start the coordinator processing loop
        self._process_loop()
    
    def stop(self) -> None:
        """Stop all agents and coordinator."""
        logger.info("Stopping HavenAI agent system...")
        self.running = False
        
        for agent in self.agents:
            agent.stop()
        
        logger.info("All agents stopped")
    
    def _process_loop(self) -> None:
        """Main coordinator loop - processes alerts and correlates findings."""
        while self.running:
            # Process any alerts in the queue
            self._process_alerts()
            
            # Correlate findings across agents
            correlated = self._correlate_findings()
            if correlated:
                for alert in correlated:
                    self._send_to_electron(alert)
            
            time.sleep(0.5)
    
    def _process_alerts(self) -> None:
        """Process alerts from the queue."""
        while True:
            try:
                alert = self.alert_queue.get_nowait()
                
                # Log the alert
                logger.info(f"Alert from {alert.get('agent')}: {alert.get('type')}")
                
                # Send to Electron
                self._send_to_electron({
                    "type": "alert",
                    "data": alert
                })
                
            except Empty:
                break
    
    def _correlate_findings(self) -> List[Dict[str, Any]]:
        """
        Correlate findings across multiple agents.
        
        This is where the multi-agent intelligence happens.
        By combining signals from multiple agents, we can detect
        more sophisticated threats.
        
        Returns:
            List of correlated alerts (if any)
        """
        correlated_alerts = []
        
        # Get findings from each agent
        file_findings = self.shared_context.get("FileAgent", {}).get("findings", [])
        process_findings = self.shared_context.get("ProcessAgent", {}).get("findings", [])
        network_findings = self.shared_context.get("NetworkAgent", {}).get("findings", [])
        
        # Correlation 1: File downloaded + Process spawned
        # If a new file was downloaded and shortly after a new process started,
        # this could indicate the file was executed
        recent_files = self.shared_context.get("FileAgent", {}).get("recent_files", [])
        recent_spawns = self.shared_context.get("ProcessAgent", {}).get("recent_spawns", [])
        
        for file_finding in file_findings:
            filename = file_finding.get("event", {}).get("filename", "")
            # Check if a process with similar name spawned
            for spawn in recent_spawns:
                if filename and spawn and filename.lower().split('.')[0] in spawn.lower():
                    correlated_alerts.append({
                        "type": "correlated_threat",
                        "severity": "critical",
                        "title": "Downloaded file was executed",
                        "description": f"The file '{filename}' was downloaded and appears to have been executed as '{spawn}'.",
                        "details": {
                            "file": filename,
                            "process": spawn,
                            "correlation_type": "download_execute",
                            "risk_score": 0.95
                        }
                    })
        
        # Correlation 2: Process spawned + Network connection
        # A new process making network connections could indicate malware phoning home
        active_ips = self.shared_context.get("NetworkAgent", {}).get("active_ips", [])
        
        for proc_finding in process_findings:
            proc_name = proc_finding.get("process", {}).get("name", "")
            # Check if this process has network findings too
            for net_finding in network_findings:
                if net_finding.get("connection", {}).get("process_name", "").lower() == proc_name.lower():
                    correlated_alerts.append({
                        "type": "correlated_threat",
                        "severity": "high",
                        "title": "Suspicious process making network connections",
                        "description": f"The suspicious process '{proc_name}' is making network connections.",
                        "details": {
                            "process": proc_name,
                            "destination": net_finding.get("connection", {}).get("remote_ip"),
                            "correlation_type": "process_network",
                            "risk_score": 0.85
                        }
                    })
        
        return correlated_alerts
    
    def _send_to_electron(self, message: Dict[str, Any]) -> None:
        """
        Send a message to Electron via stdout.
        
        Messages are JSON objects printed to stdout, one per line.
        Electron reads these and updates the UI accordingly.
        """
        try:
            print(json.dumps(message), flush=True)
        except Exception as e:
            logger.error(f"Failed to send message to Electron: {e}")
    
    def handle_electron_message(self, message: Dict[str, Any]) -> None:
        """
        Handle a message from Electron.
        
        Messages come via stdin as JSON.
        """
        msg_type = message.get("type")
        
        if msg_type == "get_status":
            # Return current status of all agents
            status = {
                "type": "status",
                "data": {
                    "agents": {
                        agent.name: self.shared_context.get(agent.name, {}).get("status", "unknown")
                        for agent in self.agents
                    },
                    "alert_count": self.alert_queue.qsize()
                }
            }
            self._send_to_electron(status)
        
        elif msg_type == "stop":
            self.stop()
        
        elif msg_type == "update_baseline":
            # Update baseline from Electron
            baseline_data = message.get("data", {})
            self.shared_context["baseline"].update(baseline_data)
            logger.info("Baseline updated from Electron")
        
        else:
            logger.warning(f"Unknown message type from Electron: {msg_type}")


def main():
    """Main entry point for the agent system."""
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('havenai-agent.log'),
            logging.StreamHandler(sys.stderr)  # Log to stderr, stdout is for Electron
        ]
    )
    
    logger.info("=" * 50)
    logger.info("HavenAI Agent System Starting")
    logger.info("=" * 50)
    
    # Create and start coordinator
    coordinator = Coordinator()
    coordinator.initialize_agents()
    
    # Send ready message to Electron
    print(json.dumps({"type": "ready"}), flush=True)
    
    # Start a thread to read messages from Electron (stdin)
    def read_stdin():
        for line in sys.stdin:
            try:
                message = json.loads(line.strip())
                coordinator.handle_electron_message(message)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from Electron: {line}")
    
    stdin_thread = Thread(target=read_stdin, daemon=True)
    stdin_thread.start()
    
    # Start the coordinator (this blocks)
    try:
        coordinator.start()
    except KeyboardInterrupt:
        logger.info("Received interrupt, shutting down...")
        coordinator.stop()


if __name__ == "__main__":
    main()
