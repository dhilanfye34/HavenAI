"""
Automated tests for FileAgent detection logic.

These tests verify that the FileAgent correctly identifies suspicious files
without requiring manual observation. Each test creates controlled inputs
and asserts that the agent produces the expected alerts.
"""

import os
import tempfile
import time
from pathlib import Path
from queue import Queue, Empty

import pytest

from havenai.agents.file_agent import FileAgent, SUSPICIOUS_EXTENSIONS


@pytest.fixture()
def agent_env(tmp_path):
    """Create a FileAgent pointed at a temporary directory."""
    shared_context = {"baseline": {"file_types": {".pdf": 0.3, ".docx": 0.2, ".jpg": 0.2}}}
    alert_queue = Queue()
    watch_dir = str(tmp_path / "Downloads")
    os.makedirs(watch_dir, exist_ok=True)

    agent = FileAgent(shared_context, alert_queue, watch_paths=[watch_dir])
    # Give watchdog a moment to start observing.
    time.sleep(0.3)
    return agent, alert_queue, watch_dir


def _drain_alerts(queue: Queue, timeout: float = 3.0) -> list:
    """Drain all alerts from the queue within *timeout* seconds."""
    alerts = []
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            alerts.append(queue.get(timeout=0.2))
        except Empty:
            if alerts:
                break
    return alerts


class TestFileAgentDetection:
    """Tests that the FileAgent flags suspicious files and ignores safe ones."""

    def test_executable_detected(self, agent_env):
        """An .exe dropped into Downloads should trigger a suspicious_download alert."""
        agent, queue, watch_dir = agent_env

        # Create a suspicious executable file.
        exe_path = os.path.join(watch_dir, "malware.exe")
        Path(exe_path).write_text("MZ fake PE header")

        # Run a few cycles so watchdog picks up the event.
        for _ in range(5):
            agent.run_cycle()
            time.sleep(0.3)

        alerts = _drain_alerts(queue)
        suspicious = [a for a in alerts if a["type"] == "suspicious_download"]
        assert len(suspicious) >= 1, f"Expected suspicious_download alert for .exe, got: {alerts}"
        assert "malware.exe" in suspicious[0]["title"]

    def test_double_extension_detected(self, agent_env):
        """A double-extension file like document.pdf.exe should be flagged."""
        agent, queue, watch_dir = agent_env

        path = os.path.join(watch_dir, "invoice.pdf.exe")
        Path(path).write_text("fake")

        for _ in range(5):
            agent.run_cycle()
            time.sleep(0.3)

        alerts = _drain_alerts(queue)
        suspicious = [a for a in alerts if a["type"] == "suspicious_download"]
        assert len(suspicious) >= 1
        details = suspicious[0].get("details", {})
        reasons = details.get("reasons", [])
        assert any("double extension" in r.lower() for r in reasons), f"Expected double extension reason, got: {reasons}"

    def test_suspicious_keyword_in_filename(self, agent_env):
        """A file with 'keygen' in its name and a suspicious extension should be flagged."""
        agent, queue, watch_dir = agent_env

        path = os.path.join(watch_dir, "photoshop_keygen.dmg")
        Path(path).write_text("fake dmg")

        for _ in range(5):
            agent.run_cycle()
            time.sleep(0.3)

        alerts = _drain_alerts(queue)
        suspicious = [a for a in alerts if a["type"] == "suspicious_download"]
        assert len(suspicious) >= 1, f"Expected alert for keygen.dmg, got: {alerts}"

    def test_safe_file_not_flagged_as_suspicious(self, agent_env):
        """A normal .txt file should NOT generate a suspicious_download alert."""
        agent, queue, watch_dir = agent_env

        path = os.path.join(watch_dir, "notes.txt")
        Path(path).write_text("just some notes")

        for _ in range(5):
            agent.run_cycle()
            time.sleep(0.3)

        alerts = _drain_alerts(queue)
        suspicious = [a for a in alerts if a["type"] == "suspicious_download"]
        assert len(suspicious) == 0, f"Safe .txt should not trigger suspicious_download: {suspicious}"

    def test_macos_noise_ignored(self, agent_env):
        """macOS system files like .DS_Store should be silently ignored."""
        agent, queue, watch_dir = agent_env

        path = os.path.join(watch_dir, ".DS_Store")
        Path(path).write_bytes(b"\x00\x00\x00\x01Bud1")

        for _ in range(3):
            agent.run_cycle()
            time.sleep(0.3)

        alerts = _drain_alerts(queue, timeout=1.0)
        # .DS_Store should be completely ignored — no alert of any kind.
        ds_alerts = [a for a in alerts if ".DS_Store" in a.get("title", "")]
        assert len(ds_alerts) == 0, f".DS_Store should be ignored: {ds_alerts}"

    def test_agent_stop(self, agent_env):
        """Agent should stop cleanly without errors."""
        agent, _, _ = agent_env
        agent.stop()
        assert agent.shared_context["FileAgent"]["status"] == "stopped"
