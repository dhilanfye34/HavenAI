"""
Baseline Builder Service

Observes user behavior over time and builds per-user baselines for:
- File extension frequency distributions
- Normal network hosts/IPs
- Normal process names

These baselines feed into each agent's risk scoring to reduce false
positives and adapt to the user's environment. The baseline persists
to local SQLite via the agent_snapshots table.
"""

import json
import logging
import time
from collections import Counter
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)

# How long to gather observations before the baseline is considered "warm"
WARMUP_SECONDS = 48 * 3600  # 48 hours

# Minimum observations before baseline data is used for scoring
MIN_FILE_OBSERVATIONS = 20
MIN_PROCESS_OBSERVATIONS = 30
MIN_NETWORK_OBSERVATIONS = 10

# How often to persist the baseline snapshot (seconds)
PERSIST_INTERVAL = 300  # 5 minutes

# How many false-positive reports on the same pattern before auto-suppressing
FALSE_POSITIVE_THRESHOLD = 3


class BaselineBuilder:
    """Builds and maintains per-user behavioral baselines.

    This service is driven by the coordinator calling ``update()`` periodically.
    It reads raw observations from ``shared_context`` (populated by agents) and
    accumulates frequency data.  Once enough data is gathered, it writes the
    computed baseline back into ``shared_context["baseline"]`` so agents pick it
    up via ``get_baseline()``.
    """

    def __init__(self, shared_context: Dict[str, Any], local_db: Any):
        self.shared_context = shared_context
        self.local_db = local_db

        # Accumulators
        self._file_extension_counts: Counter = Counter()
        self._network_hosts: Set[str] = set()
        self._process_names: Set[str] = set()

        # Feedback-driven suppressions: maps (agent, pattern) -> count
        self._false_positive_counts: Counter = Counter()
        self._suppressed_patterns: Set[tuple] = set()

        # Tracking
        self._started_at = time.time()
        self._last_persist = 0.0
        self._total_file_obs = 0
        self._total_process_obs = 0
        self._total_network_obs = 0
        self._is_warm = False

        # Try to restore from previous snapshot
        self._restore_from_snapshot()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def update(self) -> None:
        """Called periodically by the coordinator to ingest new observations
        and refresh the shared baseline."""
        self._ingest_file_observations()
        self._ingest_process_observations()
        self._ingest_network_observations()
        self._apply_feedback()
        self._publish_baseline()
        self._maybe_persist()

    def record_feedback(self, alert_id: str, alert_type: str, feedback: str,
                        pattern_key: Optional[str] = None) -> None:
        """Record user feedback on an alert and adjust baseline if needed.

        Args:
            alert_id: The alert that was reviewed.
            alert_type: e.g. "suspicious_download", "suspicious_process".
            feedback: One of "false_positive", "helpful", "dismiss".
            pattern_key: Optional identifying pattern (e.g. extension, process name).
        """
        if feedback == "false_positive" and pattern_key:
            fp_key = (alert_type, pattern_key)
            self._false_positive_counts[fp_key] += 1
            if self._false_positive_counts[fp_key] >= FALSE_POSITIVE_THRESHOLD:
                self._suppressed_patterns.add(fp_key)
                self._add_to_baseline_from_feedback(alert_type, pattern_key)
                logger.info(
                    "Pattern suppressed after %d false-positive reports: %s / %s",
                    FALSE_POSITIVE_THRESHOLD, alert_type, pattern_key,
                )

    @property
    def is_warm(self) -> bool:
        """True once enough data has been gathered for reliable baselines."""
        if self._is_warm:
            return True
        elapsed = time.time() - self._started_at
        has_enough_data = (
            self._total_file_obs >= MIN_FILE_OBSERVATIONS
            and self._total_process_obs >= MIN_PROCESS_OBSERVATIONS
            and self._total_network_obs >= MIN_NETWORK_OBSERVATIONS
        )
        self._is_warm = elapsed >= WARMUP_SECONDS or has_enough_data
        return self._is_warm

    # ------------------------------------------------------------------
    # Observation ingestion
    # ------------------------------------------------------------------

    def _ingest_file_observations(self) -> None:
        """Read recent file events from shared_context and count extensions."""
        file_ctx = self.shared_context.get("FileAgent", {})
        recent = file_ctx.get("recent_events", [])
        for event in recent:
            ext = event.get("extension")
            if ext:
                self._file_extension_counts[ext] += 1
                self._total_file_obs += 1

    def _ingest_process_observations(self) -> None:
        """Read active processes and accumulate known-safe names."""
        process_ctx = self.shared_context.get("ProcessAgent", {})
        active = process_ctx.get("active_processes", [])
        for proc in active:
            name = proc.get("name") if isinstance(proc, dict) else str(proc)
            if name:
                self._process_names.add(name)
                self._total_process_obs += 1

    def _ingest_network_observations(self) -> None:
        """Read active network connections and accumulate known hosts."""
        network_ctx = self.shared_context.get("NetworkAgent", {})
        active = network_ctx.get("active_connections", [])
        for conn in active:
            host = None
            if isinstance(conn, dict):
                host = conn.get("hostname") or conn.get("remote_ip") or conn.get("host")
            if host:
                self._network_hosts.add(host)
                self._total_network_obs += 1

    # ------------------------------------------------------------------
    # Feedback integration
    # ------------------------------------------------------------------

    def _apply_feedback(self) -> None:
        """Load recent feedback from local DB and process it."""
        if not self.local_db:
            return
        try:
            pending = self.local_db.get_pending_feedback()
            for fb in pending:
                self.record_feedback(
                    alert_id=fb.get("alert_id", ""),
                    alert_type=fb.get("alert_type", ""),
                    feedback=fb.get("feedback", "dismiss"),
                    pattern_key=fb.get("pattern_key"),
                )
        except Exception as e:
            logger.debug("Failed to load feedback: %s", e)

    def _add_to_baseline_from_feedback(self, alert_type: str, pattern_key: str) -> None:
        """When a pattern is repeatedly marked false-positive, add it to the
        baseline so agents stop flagging it."""
        if alert_type in ("suspicious_download", "new_file"):
            # pattern_key is a file extension
            self._file_extension_counts[pattern_key] += MIN_FILE_OBSERVATIONS
        elif alert_type == "suspicious_process":
            self._process_names.add(pattern_key)
        elif alert_type in ("suspicious_connection", "suspicious_network"):
            self._network_hosts.add(pattern_key)

    # ------------------------------------------------------------------
    # Baseline publishing
    # ------------------------------------------------------------------

    def _publish_baseline(self) -> None:
        """Write computed baseline into shared_context for agents to consume."""
        baseline = self.shared_context.setdefault("baseline", {})

        # File types: frequency distribution (proportion of total)
        total_files = sum(self._file_extension_counts.values())
        if total_files >= MIN_FILE_OBSERVATIONS:
            baseline["file_types"] = {
                ext: count / total_files
                for ext, count in self._file_extension_counts.items()
            }

        # Network hosts: set of known-safe hosts
        if len(self._network_hosts) >= MIN_NETWORK_OBSERVATIONS:
            baseline["network_hosts"] = list(self._network_hosts)

        # Process names: set of known-safe process names
        if len(self._process_names) >= MIN_PROCESS_OBSERVATIONS:
            baseline["process_names"] = list(self._process_names)

        # Metadata for debugging
        baseline["_meta"] = {
            "is_warm": self.is_warm,
            "file_observations": self._total_file_obs,
            "process_observations": self._total_process_obs,
            "network_observations": self._total_network_obs,
            "suppressed_patterns": len(self._suppressed_patterns),
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _maybe_persist(self) -> None:
        """Periodically save baseline state to SQLite."""
        now = time.time()
        if now - self._last_persist < PERSIST_INTERVAL:
            return
        self._persist_snapshot()
        self._last_persist = now

    def _persist_snapshot(self) -> None:
        """Save current baseline state to the agent_snapshots table."""
        if not self.local_db:
            return
        try:
            snapshot = {
                "file_extension_counts": dict(self._file_extension_counts),
                "network_hosts": list(self._network_hosts),
                "process_names": list(self._process_names),
                "false_positive_counts": {
                    f"{k[0]}::{k[1]}": v for k, v in self._false_positive_counts.items()
                },
                "suppressed_patterns": [
                    f"{p[0]}::{p[1]}" for p in self._suppressed_patterns
                ],
                "started_at": self._started_at,
                "total_file_obs": self._total_file_obs,
                "total_process_obs": self._total_process_obs,
                "total_network_obs": self._total_network_obs,
                "is_warm": self._is_warm,
            }
            self.local_db.insert_snapshot("baseline_builder", snapshot)
            logger.debug("Baseline snapshot persisted")
        except Exception as e:
            logger.debug("Failed to persist baseline snapshot: %s", e)

    def _restore_from_snapshot(self) -> None:
        """Restore baseline state from the most recent snapshot."""
        if not self.local_db:
            return
        try:
            snapshot = self.local_db.get_latest_snapshot("baseline_builder")
            if not snapshot:
                return

            ctx = snapshot if isinstance(snapshot, dict) else {}
            self._file_extension_counts = Counter(ctx.get("file_extension_counts", {}))
            self._network_hosts = set(ctx.get("network_hosts", []))
            self._process_names = set(ctx.get("process_names", []))

            # Restore false-positive tracking
            for key_str, count in ctx.get("false_positive_counts", {}).items():
                parts = key_str.split("::", 1)
                if len(parts) == 2:
                    self._false_positive_counts[tuple(parts)] = count
            for pat_str in ctx.get("suppressed_patterns", []):
                parts = pat_str.split("::", 1)
                if len(parts) == 2:
                    self._suppressed_patterns.add(tuple(parts))

            self._started_at = ctx.get("started_at", self._started_at)
            self._total_file_obs = ctx.get("total_file_obs", 0)
            self._total_process_obs = ctx.get("total_process_obs", 0)
            self._total_network_obs = ctx.get("total_network_obs", 0)
            self._is_warm = ctx.get("is_warm", False)

            logger.info(
                "Baseline restored from snapshot (files=%d, procs=%d, nets=%d, warm=%s)",
                self._total_file_obs, self._total_process_obs,
                self._total_network_obs, self._is_warm,
            )
        except Exception as e:
            logger.debug("Failed to restore baseline snapshot: %s", e)
