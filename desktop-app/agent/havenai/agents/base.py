"""
Base Agent Class

All HavenAI agents inherit from this class. It provides:
- The perceive/analyze/act pattern
- Autonomous operation loop
- Shared context access
- Alert queue for sending alerts to coordinator
"""

from abc import ABC, abstractmethod
from threading import Thread
from queue import Queue
from typing import Any, Dict, Optional
import time
import logging

logger = logging.getLogger(__name__)


class Agent(ABC):
    """
    Base class for all HavenAI agents.
    
    Each agent follows the perceive-analyze-act pattern:
    - perceive(): Observe the environment (files, network, processes)
    - analyze(): Compare observations to baseline, score risk
    - act(): Take action based on analysis (alert, block, etc.)
    
    Agents run autonomously in their own thread, continuously
    executing the perceive-analyze-act cycle.
    """
    
    def __init__(
        self, 
        shared_context: Dict[str, Any], 
        alert_queue: Queue,
        name: Optional[str] = None,
        local_db=None
    ):
        """
        Initialize the agent.
        
        Args:
            shared_context: Dictionary shared between all agents for communication
            alert_queue: Queue to send alerts to the coordinator
            name: Optional name for the agent (defaults to class name)
            local_db: Optional LocalDB instance for persisting events locally
        """
        self.shared_context = shared_context
        self.alert_queue = alert_queue
        self.name = name or self.__class__.__name__
        self.local_db = local_db
        
        self.running = False
        self._thread: Optional[Thread] = None
        
        # Initialize this agent's section in shared context
        self.shared_context[self.name] = {
            "status": "initialized",
            "last_cycle": None,
            "findings": []
        }
    
    @property
    def cycle_interval(self) -> float:
        """
        How often to run the perceive/analyze/act cycle (in seconds).
        Override in subclasses for different intervals.
        """
        return 1.0
    
    @abstractmethod
    def perceive(self) -> Dict[str, Any]:
        """
        Observe the environment.
        
        Returns:
            Dictionary containing observations from this cycle.
            
        Example for FileAgent:
            {
                "new_files": [{"path": "/Downloads/file.exe", "size": 1024}],
                "modified_files": [],
                "timestamp": 1699999999.0
            }
        """
        pass
    
    @abstractmethod
    def analyze(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze observations against baseline and rules.
        
        Args:
            observation: Output from perceive()
            
        Returns:
            Dictionary containing analysis results and any findings.
            
        Example:
            {
                "risk_score": 0.85,
                "findings": [
                    {
                        "type": "suspicious_download",
                        "file": "malware.exe",
                        "reasons": ["executable from unknown source"],
                        "risk_score": 0.85
                    }
                ]
            }
        """
        pass
    
    @abstractmethod
    def act(self, analysis: Dict[str, Any]) -> None:
        """
        Take action based on analysis results.
        
        Args:
            analysis: Output from analyze()
            
        Actions might include:
        - Sending alert to coordinator via alert_queue
        - Updating shared_context for other agents
        - Taking protective action (quarantine, block)
        """
        pass
    
    def run_cycle(self) -> None:
        """Execute one perceive -> analyze -> act cycle."""
        try:
            # Perceive
            observation = self.perceive()
            
            # Analyze
            analysis = self.analyze(observation)
            
            # Act
            self.act(analysis)
            
            # Update status in shared context
            self.shared_context[self.name]["last_cycle"] = time.time()
            self.shared_context[self.name]["status"] = "active"
            
        except Exception as e:
            logger.error(f"{self.name} cycle error: {e}")
            self.shared_context[self.name]["status"] = "error"
            self.shared_context[self.name]["last_error"] = str(e)
    
    def start(self) -> None:
        """Start the agent's autonomous operation."""
        if self.running:
            logger.warning(f"{self.name} is already running")
            return
            
        self.running = True
        self._thread = Thread(target=self._loop, daemon=True, name=self.name)
        self._thread.start()
        logger.info(f"{self.name} started")
    
    def stop(self) -> None:
        """Stop the agent's autonomous operation."""
        self.running = False
        if self._thread:
            self._thread.join(timeout=5.0)
        self.shared_context[self.name]["status"] = "stopped"
        logger.info(f"{self.name} stopped")
    
    def _loop(self) -> None:
        """Main autonomous loop - runs continuously until stopped."""
        while self.running:
            self.run_cycle()
            time.sleep(self.cycle_interval)
    
    def send_alert(self, alert: Dict[str, Any]) -> None:
        """
        Send an alert to the coordinator.
        
        Args:
            alert: Alert dictionary containing:
                - type: Alert type (suspicious_download, phishing_email, etc.)
                - severity: low, medium, high, critical
                - title: Short description
                - description: Detailed description
                - details: Additional context
        """
        alert["agent"] = self.name
        alert["timestamp"] = time.time()
        self.alert_queue.put(alert)
        logger.info(f"{self.name} sent alert: {alert['type']}")
    
    def store_event(self, kind: str, data: dict) -> None:
        """Persist an event to the local SQLite DB if available."""
        if self.local_db is None:
            return
        try:
            self.local_db.insert_event(kind, data)
        except Exception as e:
            logger.error(f"{self.name} failed to store event: {e}")

    def get_baseline(self, key: str, default: Any = None) -> Any:
        """
        Get a value from the shared baseline.
        
        Args:
            key: Key to look up in baseline
            default: Default value if key not found
            
        Returns:
            Baseline value or default
        """
        baseline = self.shared_context.get("baseline", {})
        return baseline.get(key, default)
