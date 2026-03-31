"""
Automated tests for ProcessAgent detection logic.

These tests exercise the analysis functions directly with synthetic
process data, verifying that the agent correctly scores risk for
suspicious vs normal processes.
"""

from queue import Queue

import pytest

from havenai.agents.process_agent import ProcessAgent


@pytest.fixture()
def agent():
    shared_context = {
        "baseline": {
            "process_names": [
                "chrome", "code", "python", "finder", "dock",
                "spotify", "slack", "terminal", "safari", "mail",
                "systemuiserver",
            ]
        }
    }
    queue = Queue()
    return ProcessAgent(shared_context, queue)


class TestProcessAnalysis:
    """Unit tests for the process risk scoring logic."""

    def test_known_attack_tool_flagged(self, agent):
        """Processes in the SUSPICIOUS_PROCESS_NAMES set should increase risk."""
        proc = {"name": "osascript", "pid": 9999, "ppid": 1, "parent_name": "bash", "create_time": 0}
        risk, reasons = agent._analyze_process(proc)
        assert risk > 0, f"osascript should have nonzero risk, got {risk}"
        assert any("commonly used" in r for r in reasons)

    def test_office_spawning_shell(self, agent):
        """An Office app spawning a shell interpreter is a classic attack vector."""
        proc = {"name": "bash", "pid": 5555, "ppid": 1000, "parent_name": "microsoft word", "create_time": 0}
        risk, reasons = agent._analyze_process(proc)
        assert risk >= 0.5, f"Office->shell should be high risk, got {risk}"
        assert any("office" in r.lower() for r in reasons)

    def test_browser_spawning_shell(self, agent):
        """A browser spawning curl/bash should be flagged."""
        proc = {"name": "curl", "pid": 7777, "ppid": 2000, "parent_name": "google chrome", "create_time": 0}
        risk, reasons = agent._analyze_process(proc)
        assert risk >= 0.4, f"Browser->curl should be risky, got {risk}"
        assert any("browser" in r.lower() for r in reasons)

    def test_normal_process_low_risk(self, agent):
        """A well-known process launched from a normal parent should be low risk."""
        proc = {"name": "spotify", "pid": 3333, "ppid": 1, "parent_name": "launchd", "create_time": 0}
        risk, reasons = agent._analyze_process(proc)
        assert risk < 0.5, f"Spotify from launchd should be low risk, got {risk}"

    def test_system_process_ignored(self, agent):
        """System processes should return zero risk."""
        proc = {"name": "kernel_task", "pid": 0, "ppid": 0, "parent_name": "", "create_time": 0}
        risk, reasons = agent._analyze_process(proc)
        assert risk == 0.0
        assert reasons == []

    def test_unknown_process_flagged_with_baseline(self, agent):
        """A process not in the baseline should get a small risk bump."""
        proc = {"name": "cryptominer_v2", "pid": 8888, "ppid": 1, "parent_name": "launchd", "create_time": 0}
        risk, reasons = agent._analyze_process(proc)
        assert risk > 0, f"Unknown process should have some risk, got {risk}"
        assert any("not in your normal" in r for r in reasons)

    def test_alert_sent_for_high_risk_process(self, agent):
        """When a full cycle runs with a suspicious process, an alert should be queued."""
        # Simulate an observation with a suspicious new process.
        observation = {
            "current_processes": [],
            "new_processes": [
                {"name": "nc", "pid": 6666, "ppid": 500, "parent_name": "microsoft excel", "create_time": 0}
            ],
            "total_count": 1,
            "timestamp": 0,
        }
        analysis = agent.analyze(observation)
        agent.act(analysis)

        alerts = []
        while not agent.alert_queue.empty():
            alerts.append(agent.alert_queue.get_nowait())

        suspicious = [a for a in alerts if a["type"] == "suspicious_process"]
        assert len(suspicious) >= 1, f"Expected suspicious_process alert, got: {alerts}"
