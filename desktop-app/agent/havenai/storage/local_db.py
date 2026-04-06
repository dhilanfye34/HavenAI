"""
Local SQLite storage for HavenAI desktop agent.

All raw telemetry events and alerts are persisted locally first.
Only medium+ severity alerts are synced to the cloud backend.
Data is pruned on a 7-day rolling window.
"""

import json
import logging
import os
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

SEVERITY_RANK = {"low": 1, "medium": 2, "high": 3, "critical": 4}

_DB_DIR = Path.home() / ".havenai"
_DB_PATH = _DB_DIR / "havenai.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    timestamp REAL NOT NULL,
    data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_kind_ts ON events (kind, timestamp);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    agent TEXT,
    type TEXT,
    severity TEXT,
    title TEXT,
    description TEXT,
    details TEXT,
    risk_score REAL,
    created_at REAL NOT NULL,
    is_resolved INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity_ts ON alerts (severity, created_at);

CREATE TABLE IF NOT EXISTS agent_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,
    timestamp REAL NOT NULL,
    context TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_agent_ts ON agent_snapshots (agent_name, timestamp);

CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id TEXT NOT NULL,
    alert_type TEXT NOT NULL DEFAULT '',
    pattern_key TEXT,
    feedback TEXT NOT NULL,
    processed INTEGER DEFAULT 0,
    timestamp REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_processed ON user_feedback (processed, timestamp);
"""


class LocalDB:
    """Thin wrapper around a per-user SQLite database."""

    def __init__(self, db_path: Optional[str] = None):
        path = Path(db_path) if db_path else _DB_PATH
        path.parent.mkdir(parents=True, exist_ok=True)
        self._path = str(path)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path, timeout=5)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_schema(self) -> None:
        try:
            with self._connect() as conn:
                conn.executescript(_SCHEMA)
        except Exception as e:
            logger.error("LocalDB schema init failed: %s", e)

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------

    def insert_event(self, kind: str, data: Dict[str, Any]) -> None:
        try:
            with self._connect() as conn:
                conn.execute(
                    "INSERT INTO events (kind, timestamp, data) VALUES (?, ?, ?)",
                    (kind, time.time(), json.dumps(data, default=str)),
                )
        except Exception as e:
            logger.debug("insert_event failed: %s", e)

    def query_events(
        self,
        kind: Optional[str] = None,
        since: Optional[float] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        try:
            clauses: List[str] = []
            params: List[Any] = []
            if kind:
                clauses.append("kind = ?")
                params.append(kind)
            if since:
                clauses.append("timestamp >= ?")
                params.append(since)
            where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
            sql = f"SELECT * FROM events {where} ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)

            with self._connect() as conn:
                rows = conn.execute(sql, params).fetchall()
            return [
                {
                    "id": r["id"],
                    "kind": r["kind"],
                    "timestamp": r["timestamp"],
                    "data": json.loads(r["data"]),
                }
                for r in rows
            ]
        except Exception as e:
            logger.debug("query_events failed: %s", e)
            return []

    # ------------------------------------------------------------------
    # Alerts
    # ------------------------------------------------------------------

    def insert_alert(self, alert: Dict[str, Any]) -> None:
        try:
            alert_id = alert.get("id") or str(uuid.uuid4())
            with self._connect() as conn:
                conn.execute(
                    """INSERT OR REPLACE INTO alerts
                       (id, agent, type, severity, title, description, details, risk_score, created_at, is_resolved)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        alert_id,
                        alert.get("agent", ""),
                        alert.get("type", ""),
                        alert.get("severity", "low"),
                        alert.get("title", ""),
                        alert.get("description", ""),
                        json.dumps(alert.get("details", {}), default=str),
                        alert.get("risk_score", 0.0),
                        alert.get("timestamp") or alert.get("created_at") or time.time(),
                        1 if alert.get("is_resolved") else 0,
                    ),
                )
        except Exception as e:
            logger.debug("insert_alert failed: %s", e)

    def query_alerts(
        self,
        since: Optional[float] = None,
        severity_min: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        try:
            clauses: List[str] = []
            params: List[Any] = []
            if since:
                clauses.append("created_at >= ?")
                params.append(since)
            if severity_min and severity_min in SEVERITY_RANK:
                min_rank = SEVERITY_RANK[severity_min]
                allowed = [s for s, r in SEVERITY_RANK.items() if r >= min_rank]
                placeholders = ",".join("?" for _ in allowed)
                clauses.append(f"severity IN ({placeholders})")
                params.extend(allowed)
            where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
            sql = f"SELECT * FROM alerts {where} ORDER BY created_at DESC LIMIT ?"
            params.append(limit)

            with self._connect() as conn:
                rows = conn.execute(sql, params).fetchall()
            return [
                {
                    "id": r["id"],
                    "agent": r["agent"],
                    "type": r["type"],
                    "severity": r["severity"],
                    "title": r["title"],
                    "description": r["description"],
                    "details": json.loads(r["details"]) if r["details"] else {},
                    "risk_score": r["risk_score"],
                    "created_at": r["created_at"],
                    "is_resolved": bool(r["is_resolved"]),
                }
                for r in rows
            ]
        except Exception as e:
            logger.debug("query_alerts failed: %s", e)
            return []

    # ------------------------------------------------------------------
    # Agent snapshots
    # ------------------------------------------------------------------

    def insert_snapshot(self, agent_name: str, context: Dict[str, Any]) -> None:
        try:
            with self._connect() as conn:
                conn.execute(
                    "INSERT INTO agent_snapshots (agent_name, timestamp, context) VALUES (?, ?, ?)",
                    (agent_name, time.time(), json.dumps(context, default=str)),
                )
        except Exception as e:
            logger.debug("insert_snapshot failed: %s", e)

    def get_latest_snapshot(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """Return the most recent snapshot context for the given agent."""
        try:
            with self._connect() as conn:
                row = conn.execute(
                    "SELECT context FROM agent_snapshots WHERE agent_name = ? ORDER BY timestamp DESC LIMIT 1",
                    (agent_name,),
                ).fetchone()
            if row:
                return json.loads(row["context"])
        except Exception as e:
            logger.debug("get_latest_snapshot failed: %s", e)
        return None

    # ------------------------------------------------------------------
    # User feedback
    # ------------------------------------------------------------------

    def insert_feedback(
        self, alert_id: str, feedback: str, alert_type: str = "", pattern_key: Optional[str] = None
    ) -> None:
        """Record user feedback on an alert."""
        try:
            with self._connect() as conn:
                conn.execute(
                    "INSERT INTO user_feedback (alert_id, alert_type, pattern_key, feedback, timestamp) VALUES (?, ?, ?, ?, ?)",
                    (alert_id, alert_type, pattern_key, feedback, time.time()),
                )
        except Exception as e:
            logger.debug("insert_feedback failed: %s", e)

    def get_pending_feedback(self) -> List[Dict[str, Any]]:
        """Return unprocessed feedback entries and mark them as processed."""
        try:
            with self._connect() as conn:
                rows = conn.execute(
                    "SELECT id, alert_id, alert_type, pattern_key, feedback, timestamp "
                    "FROM user_feedback WHERE processed = 0 ORDER BY timestamp"
                ).fetchall()
                if rows:
                    ids = [r["id"] for r in rows]
                    placeholders = ",".join("?" for _ in ids)
                    conn.execute(
                        f"UPDATE user_feedback SET processed = 1 WHERE id IN ({placeholders})",
                        ids,
                    )
                return [
                    {
                        "alert_id": r["alert_id"],
                        "alert_type": r["alert_type"],
                        "pattern_key": r["pattern_key"],
                        "feedback": r["feedback"],
                        "timestamp": r["timestamp"],
                    }
                    for r in rows
                ]
        except Exception as e:
            logger.debug("get_pending_feedback failed: %s", e)
            return []

    # ------------------------------------------------------------------
    # Maintenance
    # ------------------------------------------------------------------

    def clear(self) -> None:
        """Wipe all device-specific data (events, alerts, snapshots).

        Called when unlinking a device to prevent data leakage between accounts.
        """
        try:
            with self._connect() as conn:
                conn.execute("DELETE FROM events")
                conn.execute("DELETE FROM alerts")
                conn.execute("DELETE FROM agent_snapshots")
                conn.execute("DELETE FROM user_feedback")
            logger.info("LocalDB cleared all device-specific data")
        except Exception as e:
            logger.debug("clear failed: %s", e)

    def prune(self, event_days: int = 7, alert_days: int = 30) -> int:
        """Prune old data with differentiated retention.

        Events and snapshots are deleted after ``event_days`` (default 7).
        Alerts are retained longer — ``alert_days`` (default 30) — so users
        can review recent alert history even after raw telemetry is gone.
        """
        now = time.time()
        event_cutoff = now - (event_days * 86400)
        alert_cutoff = now - (alert_days * 86400)
        total = 0
        try:
            with self._connect() as conn:
                cur = conn.execute("DELETE FROM events WHERE timestamp < ?", (event_cutoff,))
                total += cur.rowcount
                cur = conn.execute("DELETE FROM agent_snapshots WHERE timestamp < ?", (event_cutoff,))
                total += cur.rowcount
                cur = conn.execute("DELETE FROM alerts WHERE created_at < ?", (alert_cutoff,))
                total += cur.rowcount
            if total:
                logger.info("LocalDB pruned %d rows (events >%dd, alerts >%dd)", total, event_days, alert_days)
        except Exception as e:
            logger.debug("prune failed: %s", e)
        return total

    # ------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------

    def get_stats(self) -> Dict[str, Any]:
        now = time.time()
        day_ago = now - 86400
        week_ago = now - 7 * 86400
        stats: Dict[str, Any] = {"events_24h": {}, "events_7d": {}, "alerts_24h": {}, "alerts_7d": {}, "total_events": 0, "total_alerts": 0}
        try:
            with self._connect() as conn:
                for label, cutoff in [("24h", day_ago), ("7d", week_ago)]:
                    rows = conn.execute(
                        "SELECT kind, COUNT(*) as cnt FROM events WHERE timestamp >= ? GROUP BY kind",
                        (cutoff,),
                    ).fetchall()
                    stats[f"events_{label}"] = {r["kind"]: r["cnt"] for r in rows}

                    rows = conn.execute(
                        "SELECT severity, COUNT(*) as cnt FROM alerts WHERE created_at >= ? GROUP BY severity",
                        (cutoff,),
                    ).fetchall()
                    stats[f"alerts_{label}"] = {r["severity"]: r["cnt"] for r in rows}

                stats["total_events"] = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
                stats["total_alerts"] = conn.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
        except Exception as e:
            logger.debug("get_stats failed: %s", e)
        return stats
