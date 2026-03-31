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
from pathlib import Path

from .base import Agent
from .file_agent import FileAgent
from .process_agent import ProcessAgent
from .network_agent import NetworkAgent
from .email_inbox_agent import EmailInboxAgent
from .message_agent import MessageAgent
from havenai.api import get_client
from havenai.storage.local_db import LocalDB

logger = logging.getLogger(__name__)

try:
    import psutil  # type: ignore
except Exception:  # pragma: no cover - optional fallback
    psutil = None


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
        self._consecutive_heartbeat_failures = 0
        self._max_heartbeat_failures = 1  # stop trying after 1 failure — wait for fresh auth from Electron
        self._last_preferences_sync = 0.0
        self._preferences_sync_interval = 20.0

        self._default_monitor_preferences = {
            "file_monitoring_enabled": False,
            "process_monitoring_enabled": False,
            "network_monitoring_enabled": False,
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
        # When a user toggles monitor modules in the desktop UI, prefer those local
        # runtime choices instead of periodically re-overwriting from backend prefs.
        self._local_preferences_override = False
        self._started_at = time.time()
        self._alerts_processed = 0

        # Local SQLite storage
        self.local_db = LocalDB()
        self.local_db.prune(event_days=7)
        self._last_prune = time.time()
        self._prune_interval = 86400
    
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

        # Strict local startup: monitor modules begin from local desired state (default off).
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

            # Prune old local data daily
            now = time.time()
            if now - self._last_prune >= self._prune_interval:
                try:
                    self.local_db.prune(event_days=7)
                except Exception as e:
                    logger.debug(f"Periodic prune failed: {e}")
                self._last_prune = now

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
        self._alerts_processed += 1

        try:
            self.local_db.insert_alert(alert)
        except Exception as e:
            logger.error(f"Failed to insert alert into local DB: {e}")

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
        
        # Sync medium+ severity alerts to cloud backend (with PII scrubbed).
        if (
            self.sync_to_cloud
            and self.api_client
            and self.api_client.is_authenticated()
            and alert.get("severity", "low") in ("medium", "high", "critical")
        ):
            try:
                self.api_client.send_alert(self._scrub_alert_for_cloud(alert))
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

        # Circuit breaker: stop hammering the backend with a dead token.
        if self._consecutive_heartbeat_failures >= self._max_heartbeat_failures:
            return

        now = time.time()
        if now - self._last_heartbeat >= self._heartbeat_interval:
            heartbeat_ok = False
            if self.api_client.is_authenticated():
                heartbeat_ok = self.api_client.heartbeat()
                if not heartbeat_ok and self.api_client.has_tokens() and not self.api_client.device_id:
                    heartbeat_ok = self._ensure_device_registered()
                if not heartbeat_ok and self.api_client.refresh_access_token():
                    heartbeat_ok = self.api_client.heartbeat()
                    if not heartbeat_ok and self.api_client.has_tokens() and not self.api_client.device_id:
                        heartbeat_ok = self._ensure_device_registered()
            elif self.api_client.has_tokens():
                heartbeat_ok = self._ensure_device_registered()

            self._auth_status["last_heartbeat_ok"] = heartbeat_ok
            self._auth_status["last_heartbeat_at"] = now
            if heartbeat_ok:
                self._auth_status["state"] = "connected"
                self._auth_status["last_error"] = None
                self._consecutive_heartbeat_failures = 0
            else:
                self._consecutive_heartbeat_failures += 1
                if self._consecutive_heartbeat_failures >= self._max_heartbeat_failures:
                    self._auth_status["state"] = "auth_expired"
                    self._auth_status["last_error"] = "Session expired. Please re-login."
                    logger.warning("Heartbeat circuit breaker tripped after %d failures — stopping retries", self._consecutive_heartbeat_failures)
                elif self.api_client.has_tokens():
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
        if not force and self._local_preferences_override:
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
        """Start/stop monitor agents to match desired preferences.

        Agent stops are performed in a background thread so the stdin reader
        thread (which processes Electron messages) is never blocked by a
        ``thread.join`` that could take up to 5 s per agent.
        """
        for pref_key, (agent_name, agent_cls) in self._monitor_config_map.items():
            should_enable = bool(self._desired_preferences.get(pref_key, True))
            is_running = agent_name in self.monitor_agents

            if should_enable and not is_running:
                agent = agent_cls(self.shared_context, self.alert_queue, local_db=self.local_db)
                agent.start()
                self.monitor_agents[agent_name] = agent
                logger.info(f"Enabled monitor module: {agent_name}")
            elif not should_enable and is_running:
                agent = self.monitor_agents.pop(agent_name)
                # Stop in a background thread to avoid blocking the stdin reader.
                def _stop_agent(a: "Agent", name: str) -> None:
                    try:
                        a.stop()
                    except Exception as exc:
                        logger.warning(f"Error stopping {name}: {exc}")
                Thread(target=_stop_agent, args=(agent, agent_name), daemon=True).start()
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
        metrics = self._collect_runtime_metrics()
        return {
            "agents": {**monitor_status, **always_on_status},
            "enabled_modules": dict(self._desired_preferences),
            "cloud_connected": self.api_client.is_authenticated() if self.api_client else False,
            "has_tokens": self.api_client.has_tokens() if self.api_client else False,
            "device_id": self.api_client.device_id if self.api_client else None,
            "auth_status": dict(self._auth_status),
            "alert_count": self._alerts_processed,
            "metrics": metrics,
            "module_details": self._collect_module_details(),
            "permission_hints": self._collect_permission_hints(metrics),
        }

    def _collect_runtime_metrics(self) -> Dict[str, Any]:
        """Collect live runtime telemetry for right-side dashboard cards."""
        file_ctx = self.shared_context.get("FileAgent", {})
        process_ctx = self.shared_context.get("ProcessAgent", {})
        network_ctx = self.shared_context.get("NetworkAgent", {})
        file_running = "FileAgent" in self.monitor_agents
        process_running = "ProcessAgent" in self.monitor_agents
        network_running = "NetworkAgent" in self.monitor_agents

        cpu_usage = 0.0
        memory_usage = 0.0
        disk_usage = 0.0
        process_count = int(process_ctx.get("process_count", 0) or 0) if process_running else 0
        network_connection_count = (
            int(network_ctx.get("connection_count", 0) or 0) if network_running else 0
        )
        active_remote_ips = len(network_ctx.get("active_ips", []) or []) if network_running else 0

        if psutil:
            try:
                cpu_usage = float(psutil.cpu_percent(interval=None))
            except Exception:
                cpu_usage = 0.0
            try:
                memory_usage = float(psutil.virtual_memory().percent)
            except Exception:
                memory_usage = 0.0
            try:
                disk_usage = float(psutil.disk_usage(str(Path.home())).percent)
            except Exception:
                disk_usage = 0.0
            if process_running:
                try:
                    process_count = max(process_count, len(psutil.pids()))
                except Exception:
                    pass
            if network_running:
                try:
                    conns = psutil.net_connections(kind="inet")
                    remote = [c for c in conns if c.raddr]
                    network_connection_count = max(network_connection_count, len(remote))
                    active_remote_ips = max(
                        active_remote_ips,
                        len({c.raddr.ip for c in remote if getattr(c.raddr, "ip", None)}),
                    )
                except Exception:
                    pass

        log_usage = 0.0
        try:
            log_path = Path("havenai-agent.log")
            if log_path.exists():
                # Map log file growth into a friendly 0-100 gauge.
                log_usage = min(100.0, (log_path.stat().st_size / (1024 * 1024 * 20)) * 100.0)
        except Exception:
            log_usage = 0.0

        return {
            "process_count": process_count,
            "process_events_seen": int(process_ctx.get("total_new_processes", 0) or 0)
            if process_running
            else 0,
            "network_connection_count": network_connection_count,
            "network_events_seen": int(network_ctx.get("total_new_connections", 0) or 0)
            if network_running
            else 0,
            "active_remote_ips": active_remote_ips,
            "file_events_seen": int(file_ctx.get("total_event_count", 0) or 0)
            if file_running
            else 0,
            "cpu_usage_percent": round(cpu_usage, 2),
            "memory_usage_percent": round(memory_usage, 2),
            "disk_usage_percent": round(disk_usage, 2),
            "log_storage_usage_percent": round(log_usage, 2),
            "uptime_seconds": max(0, int(time.time() - self._started_at)),
        }

    def _collect_module_details(self) -> Dict[str, Any]:
        """Build rich per-module detail payload for the runtime inspector UI."""
        file_ctx = self.shared_context.get("FileAgent", {})
        process_ctx = self.shared_context.get("ProcessAgent", {})
        network_ctx = self.shared_context.get("NetworkAgent", {})
        file_running = "FileAgent" in self.monitor_agents
        process_running = "ProcessAgent" in self.monitor_agents
        network_running = "NetworkAgent" in self.monitor_agents

        top_processes: List[Dict[str, Any]] = []
        if psutil and process_running:
            try:
                for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent", "status"]):
                    try:
                        info = proc.info
                        top_processes.append(
                            {
                                "pid": info.get("pid"),
                                "name": info.get("name") or "unknown",
                                "cpu_percent": float(info.get("cpu_percent") or 0.0),
                                "memory_percent": float(info.get("memory_percent") or 0.0),
                                "status": info.get("status") or "unknown",
                            }
                        )
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                top_processes.sort(
                    key=lambda p: (p.get("cpu_percent", 0.0), p.get("memory_percent", 0.0)),
                    reverse=True,
                )
            except Exception:
                top_processes = []

        return {
            "file": {
                "event_count": int(file_ctx.get("total_event_count", 0) or 0) if file_running else 0,
                "recent_events": list(file_ctx.get("recent_events", []) or [])[-20:] if file_running else [],
            },
            "process": {
                "event_count": int(process_ctx.get("total_new_processes", 0) or 0)
                if process_running
                else 0,
                "recent_events": list(process_ctx.get("recent_process_events", []) or [])[-20:]
                if process_running
                else [],
                "active_processes": list(process_ctx.get("active_processes", []) or [])[:40]
                if process_running
                else [],
                "top_processes": top_processes[:12],
            },
            "network": {
                "event_count": int(network_ctx.get("total_new_connections", 0) or 0)
                if network_running
                else 0,
                "recent_events": list(network_ctx.get("recent_network_events", []) or [])[-20:]
                if network_running
                else [],
                "active_connections": list(network_ctx.get("active_connections", []) or [])[:50]
                if network_running
                else [],
            },
        }

    def _collect_permission_hints(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Return platform-specific permission guidance and probable blockers."""
        uptime = int(metrics.get("uptime_seconds", 0))
        monitored_total = (
            int(metrics.get("file_events_seen", 0))
            + int(metrics.get("process_events_seen", 0))
            + int(metrics.get("network_events_seen", 0))
        )
        monitors_enabled = any(
            bool(self._desired_preferences.get(key))
            for key in self._default_monitor_preferences.keys()
        )
        maybe_blocked = bool(monitors_enabled and uptime >= 45 and monitored_total == 0)
        return {
            "platform": sys.platform,
            "maybe_blocked": maybe_blocked,
            "items": [
                {
                    "id": "full_disk_access",
                    "label": "Full Disk Access",
                    "description": "Allows file monitoring to inspect Desktop/Downloads paths reliably.",
                },
                {
                    "id": "files_and_folders",
                    "label": "Files and Folders",
                    "description": "Grant Desktop and Downloads access for event visibility.",
                },
                {
                    "id": "network",
                    "label": "Network Monitoring Access",
                    "description": "Some macOS setups limit process-to-socket visibility without additional privileges.",
                },
            ],
        }

    @staticmethod
    def _scrub_path(value: str) -> str:
        """Replace /Users/<username>/ with ~/…/ to avoid leaking local usernames."""
        import re
        return re.sub(r"/Users/[^/]+/", "~/…/", value)

    def _scrub_alert_for_cloud(self, alert: Dict[str, Any]) -> Dict[str, Any]:
        """Return a copy of the alert with PII-sensitive paths scrubbed."""
        import copy
        scrubbed = copy.deepcopy(alert)
        details = scrubbed.get("details")
        if isinstance(details, dict):
            for key in ("path", "filename", "file"):
                if isinstance(details.get(key), str):
                    details[key] = self._scrub_path(details[key])
        if isinstance(scrubbed.get("description"), str):
            scrubbed["description"] = self._scrub_path(scrubbed["description"])
        if isinstance(scrubbed.get("title"), str):
            scrubbed["title"] = self._scrub_path(scrubbed["title"])
        return scrubbed

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
                # Reset heartbeat circuit breaker on fresh auth.
                self._consecutive_heartbeat_failures = 0
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
                self._local_preferences_override = True
                self._sync_monitor_agents()
                self._send_to_electron(
                    {
                        "type": "preferences_applied",
                        "data": {"monitoring": dict(self._desired_preferences)},
                    }
                )
                self._send_status()

        elif msg_type == "configure_email":
            data = message.get("data", {})
            host = data.get("host", "")
            port = int(data.get("port", 993))
            user = data.get("user", "")
            password = data.get("password", "")

            result = EmailInboxAgent.test_connection(host, port, user, password)

            if result["success"]:
                for agent in self.always_on_agents:
                    if isinstance(agent, EmailInboxAgent):
                        agent.configure(host, port, user, password)
                        break

            self._send_to_electron({
                "type": "email-config-result",
                "data": result
            })

        elif msg_type == "disconnect_email":
            for agent in self.always_on_agents:
                if isinstance(agent, EmailInboxAgent):
                    agent.disconnect()
                    break
            # Clean up any env vars that may have been set by older versions
            import os
            os.environ.pop("HAVENAI_IMAP_HOST", None)
            os.environ.pop("HAVENAI_IMAP_PORT", None)
            os.environ.pop("HAVENAI_IMAP_USER", None)
            os.environ.pop("HAVENAI_IMAP_PASSWORD", None)

        elif msg_type == "query_events":
            data = message.get("data", {})
            events = self.local_db.query_events(
                kind=data.get("kind"),
                since=data.get("since"),
                limit=data.get("limit", 100),
            )
            self._send_to_electron({"type": "local-events", "data": events})

        elif msg_type == "query_alerts":
            data = message.get("data", {})
            alerts = self.local_db.query_alerts(
                since=data.get("since"),
                severity_min=data.get("severityMin"),
                limit=data.get("limit", 100),
            )
            self._send_to_electron({"type": "local-alerts", "data": alerts})

        elif msg_type == "get_local_stats":
            stats = self.local_db.get_stats()
            self._send_to_electron({"type": "local-stats", "data": stats})

        elif msg_type == "logout":
            if self.api_client:
                self.api_client.clear_session()
            self._auth_status["state"] = "unauthenticated"
            self._auth_status["last_error"] = None
            self._local_preferences_override = False
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
