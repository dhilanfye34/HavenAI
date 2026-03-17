"""
Coordinator Agent

The master orchestrator that:
- Starts and manages all other agents
- Maintains the shared context
- Correlates findings across agents
- Sends alerts to the cloud backend
- Communicates with Electron UI
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
from .email_inbox_agent import EmailInboxAgent
from .message_agent import MessageAgent
from havenai.api import get_client

logger = logging.getLogger(__name__)


class Coordinator:
    """
    Master coordinator for the HavenAI agent system.
    
    Responsibilities:
    - Initialize and manage all agents
    - Maintain shared context for inter-agent communication
    - Process and correlate alerts from all agents
    - Sync alerts to cloud backend
    - Communicate with Electron via stdin/stdout JSON messages
    """
    
    def __init__(self, sync_to_cloud: bool = True):
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
        self.monitor_agents: Dict[str, Agent] = {}
        self.always_on_agents: List[Agent] = []
        self.running = False
        
        # Cloud sync
        self.sync_to_cloud = sync_to_cloud
        self.api_client = get_client() if sync_to_cloud else None
        
        # Heartbeat tracking
        self._last_heartbeat = 0
        self._heartbeat_interval = 60  # seconds
        self._last_preferences_sync = 0.0
        self._preferences_sync_interval = 20.0

        self._default_monitor_preferences = {
            "file_monitoring_enabled": True,
            "process_monitoring_enabled": True,
            "network_monitoring_enabled": True,
        }
        self._monitor_config_map = {
            "file_monitoring_enabled": ("FileAgent", FileAgent),
            "process_monitoring_enabled": ("ProcessAgent", ProcessAgent),
            "network_monitoring_enabled": ("NetworkAgent", NetworkAgent),
        }
        self._desired_preferences: Dict[str, bool] = dict(self._default_monitor_preferences)
        self._device_metadata: Dict[str, Any] = {
            "name": "HavenAI Desktop",
            "os_type": "unknown",
            "os_version": None,
            "app_version": "0.1.0",
            "machine_id": None,
        }
        self._auth_status: Dict[str, Any] = {
            "state": "unauthenticated",
            "last_error": None,
            "last_heartbeat_ok": None,
            "last_heartbeat_at": None,
        }
    
    def initialize_agents(self) -> None:
        """Create all agent instances."""
        logger.info("Initializing agents...")

        # Always-on support agents.
        self.always_on_agents = [
            EmailInboxAgent(self.shared_context, self.alert_queue),
            MessageAgent(self.shared_context, self.alert_queue),
        ]

        logger.info(f"Initialized {len(self.always_on_agents)} always-on agents")
    
    def start(self) -> None:
        """Start all agents and the coordinator loop."""
        logger.info("Starting HavenAI agent system...")
        
        self.running = True

        # Start always-on agents.
        for agent in self.always_on_agents:
            agent.start()
            logger.info(f"  ✓ {agent.name} started")

        # Hydrate runtime modules from remote preferences (if authenticated).
        self._fetch_and_apply_preferences(force=True, send_event=False)
        self._sync_monitor_agents()
        self._send_status()
        
        # Start the coordinator processing loop
        self._process_loop()
    
    def stop(self) -> None:
        """Stop all agents and coordinator."""
        logger.info("Stopping HavenAI agent system...")
        self.running = False

        for agent in list(self.monitor_agents.values()):
            agent.stop()
        for agent in self.always_on_agents:
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
                    self._handle_alert(alert)
            
            # Send heartbeat periodically
            self._maybe_send_heartbeat()

            # Sync preferences from backend periodically when authenticated.
            self._maybe_sync_preferences()
            
            time.sleep(0.5)
    
    def _process_alerts(self) -> None:
        """Process alerts from the queue."""
        while True:
            try:
                alert = self.alert_queue.get_nowait()
                self._handle_alert(alert)
            except Empty:
                break
    
    def _handle_alert(self, alert: Dict[str, Any]) -> None:
        """Handle a single alert - log, sync to cloud, notify UI."""
        # Log the alert
        logger.info(f"Alert from {alert.get('agent', 'unknown')}: {alert.get('type')}")

        # Forward alert to message channel router agent (if present).
        for agent in self.always_on_agents:
            enqueue_fn = getattr(agent, "enqueue_alert", None)
            if callable(enqueue_fn):
                try:
                    enqueue_fn(alert)
                except Exception as e:
                    logger.debug(f"Failed to enqueue alert for {agent.name}: {e}")
        
        # Sync to cloud backend
        if self.sync_to_cloud and self.api_client and self.api_client.is_authenticated():
            try:
                self.api_client.send_alert(alert)
            except Exception as e:
                logger.error(f"Failed to sync alert to cloud: {e}")
        
        # Send to Electron UI
        self._send_to_electron({
            "type": "alert",
            "data": alert
        })
    
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
        recent_files = self.shared_context.get("FileAgent", {}).get("recent_files", [])
        recent_spawns = self.shared_context.get("ProcessAgent", {}).get("recent_spawns", [])
        
        for file_finding in file_findings:
            filename = file_finding.get("event", {}).get("filename", "")
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
        for proc_finding in process_findings:
            proc_name = proc_finding.get("process", {}).get("name", "")
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
    
    def _maybe_send_heartbeat(self) -> None:
        """Send heartbeat to backend if enough time has passed."""
        if not self.sync_to_cloud or not self.api_client:
            return
        
        now = time.time()
        if now - self._last_heartbeat >= self._heartbeat_interval:
            heartbeat_ok = False
            if self.api_client.is_authenticated():
                heartbeat_ok = self.api_client.heartbeat()
                if not heartbeat_ok and self.api_client.refresh_access_token():
                    heartbeat_ok = self.api_client.heartbeat()
            elif self.api_client.has_tokens():
                # We have auth tokens but no device id yet.
                heartbeat_ok = self._ensure_device_registered()

            self._auth_status["last_heartbeat_ok"] = heartbeat_ok
            self._auth_status["last_heartbeat_at"] = now
            if heartbeat_ok:
                self._auth_status["state"] = "connected"
                self._auth_status["last_error"] = None
            else:
                if self.api_client.has_tokens():
                    self._auth_status["state"] = "degraded"
            self._last_heartbeat = now
            self._send_status()

    def _maybe_sync_preferences(self) -> None:
        """Refresh monitor preferences from backend on a timer."""
        if not self.api_client or not self.api_client.has_tokens():
            return

        now = time.time()
        if now - self._last_preferences_sync >= self._preferences_sync_interval:
            self._fetch_and_apply_preferences(force=False, send_event=True)
            self._last_preferences_sync = now

    def _fetch_and_apply_preferences(self, force: bool, send_event: bool) -> None:
        """Fetch latest setup preferences and apply local monitor runtime changes."""
        if not self.api_client or not self.api_client.has_tokens():
            return

        prefs = self.api_client.get_setup_preferences()
        if not prefs:
            return

        changed = False
        for key in self._default_monitor_preferences.keys():
            if key in prefs:
                next_value = bool(prefs[key])
                if force or self._desired_preferences.get(key) != next_value:
                    self._desired_preferences[key] = next_value
                    changed = True

        if changed or force:
            self._sync_monitor_agents()
            if send_event:
                self._send_to_electron(
                    {
                        "type": "preferences_applied",
                        "data": {
                            "monitoring": dict(self._desired_preferences),
                        },
                    }
                )
            self._send_status()

    def _sync_monitor_agents(self) -> None:
        """Start/stop monitor agents to match desired preferences."""
        for pref_key, (agent_name, agent_cls) in self._monitor_config_map.items():
            should_enable = bool(self._desired_preferences.get(pref_key, True))
            is_running = agent_name in self.monitor_agents

            if should_enable and not is_running:
                agent = agent_cls(self.shared_context, self.alert_queue)
                agent.start()
                self.monitor_agents[agent_name] = agent
                logger.info(f"Enabled monitor module: {agent_name}")
            elif not should_enable and is_running:
                agent = self.monitor_agents.pop(agent_name)
                agent.stop()
                logger.info(f"Disabled monitor module: {agent_name}")

    def _ensure_device_registered(self) -> bool:
        """Register the current desktop device when auth exists but no device id."""
        if not self.api_client or not self.api_client.has_tokens():
            return False
        if self.api_client.device_id:
            return True

        try:
            device = self.api_client.register_device(
                name=self._device_metadata.get("name", "HavenAI Desktop"),
                os_type=self._device_metadata.get("os_type", "unknown"),
                os_version=self._device_metadata.get("os_version"),
                app_version=self._device_metadata.get("app_version", "0.1.0"),
                machine_id=self._device_metadata.get("machine_id"),
            )
            self._send_to_electron(
                {
                    "type": "device_registered",
                    "data": {"device_id": device.get("id"), "name": device.get("name")},
                }
            )
            logger.info("Registered desktop device with backend")
            return True
        except Exception as e:
            self._auth_status["last_error"] = str(e)
            logger.warning(f"Device registration failed: {e}")
            return False

    def _build_status_payload(self) -> Dict[str, Any]:
        """Build current status payload sent to Electron."""
        monitor_status = {
            name: self.shared_context.get(name, {}).get("status", "stopped")
            for _, (name, _) in self._monitor_config_map.items()
        }
        always_on_status = {
            agent.name: self.shared_context.get(agent.name, {}).get("status", "unknown")
            for agent in self.always_on_agents
        }
        return {
            "agents": {**monitor_status, **always_on_status},
            "enabled_modules": dict(self._desired_preferences),
            "cloud_connected": self.api_client.is_authenticated() if self.api_client else False,
            "has_tokens": self.api_client.has_tokens() if self.api_client else False,
            "device_id": self.api_client.device_id if self.api_client else None,
            "auth_status": dict(self._auth_status),
            "alert_count": self.alert_queue.qsize(),
        }

    def _send_status(self) -> None:
        self._send_to_electron({"type": "status", "data": self._build_status_payload()})
    
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
            self._send_status()
        
        elif msg_type == "stop":
            self.stop()
        
        elif msg_type == "update_baseline":
            baseline_data = message.get("data", {})
            self.shared_context["baseline"].update(baseline_data)
            logger.info("Baseline updated from Electron")
        
        elif msg_type == "login":
            # Handle login from UI
            email = message.get("email")
            password = message.get("password")
            device = message.get("device") or {}
            self._device_metadata.update(
                {
                    "name": device.get("name", self._device_metadata.get("name")),
                    "os_type": device.get("os_type", self._device_metadata.get("os_type")),
                    "os_version": device.get("os_version", self._device_metadata.get("os_version")),
                    "app_version": device.get("app_version", self._device_metadata.get("app_version")),
                    "machine_id": device.get("machine_id", self._device_metadata.get("machine_id")),
                }
            )
            if self.api_client and email and password:
                try:
                    self.api_client.login(email, password)
                    self._ensure_device_registered()
                    self._fetch_and_apply_preferences(force=True, send_event=True)
                    self._auth_status["state"] = "connected"
                    self._auth_status["last_error"] = None
                    self._send_to_electron(
                        {
                            "type": "login_success",
                            "data": {
                                "device_id": self.api_client.device_id,
                                "monitoring": dict(self._desired_preferences),
                            },
                        }
                    )
                    self._send_status()
                except Exception as e:
                    self._auth_status["state"] = "error"
                    self._auth_status["last_error"] = str(e)
                    self._send_to_electron({"type": "login_error", "error": str(e)})

        elif msg_type == "sync_auth":
            if not self.api_client:
                return
            access_token = message.get("access_token")
            refresh_token = message.get("refresh_token")
            user = message.get("user") or {}
            device_id = message.get("device_id")
            device = message.get("device") or {}

            if access_token:
                self.api_client.set_session(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    user_id=user.get("id"),
                    device_id=device_id,
                )
                self._device_metadata.update(
                    {
                        "name": device.get("name", self._device_metadata.get("name")),
                        "os_type": device.get("os_type", self._device_metadata.get("os_type")),
                        "os_version": device.get("os_version", self._device_metadata.get("os_version")),
                        "app_version": device.get("app_version", self._device_metadata.get("app_version")),
                        "machine_id": device.get("machine_id", self._device_metadata.get("machine_id")),
                    }
                )
                self._ensure_device_registered()
                self._fetch_and_apply_preferences(force=True, send_event=True)
                self._auth_status["state"] = "connected" if self.api_client.is_authenticated() else "partial"
                self._auth_status["last_error"] = None
                self._send_to_electron(
                    {
                        "type": "auth_synced",
                        "data": {"device_id": self.api_client.device_id},
                    }
                )
                self._send_status()

        elif msg_type == "update_preferences":
            data = message.get("data") or {}
            changed = False
            for key in self._default_monitor_preferences.keys():
                if key in data:
                    next_value = bool(data[key])
                    if self._desired_preferences.get(key) != next_value:
                        self._desired_preferences[key] = next_value
                        changed = True

            if changed:
                self._sync_monitor_agents()
                self._send_to_electron(
                    {
                        "type": "preferences_applied",
                        "data": {"monitoring": dict(self._desired_preferences)},
                    }
                )
                self._send_status()

        elif msg_type == "logout":
            if self.api_client:
                self.api_client.clear_session()
            self._auth_status["state"] = "unauthenticated"
            self._auth_status["last_error"] = None
            self._send_status()
        
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
            logging.StreamHandler(sys.stderr)
        ]
    )
    
    logger.info("=" * 50)
    logger.info("HavenAI Agent System Starting")
    logger.info("=" * 50)
    
    # Create and start coordinator
    coordinator = Coordinator(sync_to_cloud=True)
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
