"""
Automated tests for NetworkAgent detection logic.

These tests exercise the connection analysis directly with synthetic
network data, verifying risk scoring for suspicious vs safe connections.
"""

from queue import Queue

import pytest

from havenai.agents.network_agent import NetworkAgent, SUSPICIOUS_PORTS


@pytest.fixture()
def agent():
    shared_context = {
        "baseline": {
            "network_hosts": [
                "google.com", "github.com", "apple.com",
                "cloudflare.com", "amazonaws.com", "slack.com",
            ]
        }
    }
    queue = Queue()
    return NetworkAgent(shared_context, queue)


class TestNetworkAnalysis:
    """Unit tests for connection risk scoring."""

    def test_suspicious_port_flagged(self, agent):
        """Connections to known-malicious ports should score high."""
        conn = {
            "remote_ip": "203.0.113.50",
            "remote_port": 4444,
            "process_name": "unknown",
            "hostname": None,
            "pid": 1234,
        }
        risk, reasons = agent._analyze_connection(conn)
        assert risk >= 0.5, f"Port 4444 should be high risk, got {risk}"
        assert any("suspicious port" in r.lower() for r in reasons)

    def test_safe_domain_reduces_risk(self, agent):
        """Connections to well-known safe domains should be low risk."""
        conn = {
            "remote_ip": "142.250.80.46",
            "remote_port": 443,
            "process_name": "chrome",
            "hostname": "www.google.com",
            "pid": 100,
        }
        risk, reasons = agent._analyze_connection(conn)
        assert risk < 0.3, f"google.com:443 should be low risk, got {risk}"

    def test_unfamiliar_host_flagged(self, agent):
        """A connection to a host not in the baseline should add risk."""
        conn = {
            "remote_ip": "198.51.100.77",
            "remote_port": 443,
            "process_name": "python3",
            "hostname": "shady-server.example.com",
            "pid": 200,
        }
        risk, reasons = agent._analyze_connection(conn)
        assert risk > 0, f"Unfamiliar host should have risk, got {risk}"
        assert any("unfamiliar" in r.lower() for r in reasons)

    def test_private_ip_reduces_risk(self, agent):
        """Connections to private/LAN IPs should reduce overall risk."""
        conn = {
            "remote_ip": "192.168.1.1",
            "remote_port": 8080,
            "process_name": "chrome",
            "hostname": None,
            "pid": 300,
        }
        risk, _ = agent._analyze_connection(conn)
        assert risk < 0.3, f"Private IP should be low risk, got {risk}"

    def test_non_network_process_flagged(self, agent):
        """Processes that shouldn't make network connections get flagged."""
        conn = {
            "remote_ip": "203.0.113.10",
            "remote_port": 443,
            "process_name": "notepad",
            "hostname": None,
            "pid": 400,
        }
        risk, reasons = agent._analyze_connection(conn)
        assert risk >= 0.5, f"notepad networking should be risky, got {risk}"
        assert any("should not be making" in r for r in reasons)

    def test_alert_queued_for_suspicious_connection(self, agent):
        """A full analyze+act cycle should queue an alert for a bad connection."""
        observation = {
            "connections": [],
            "new_connections": [
                {
                    "remote_ip": "198.51.100.99",
                    "remote_port": 4444,
                    "process_name": "nc",
                    "hostname": None,
                    "pid": 500,
                    "local_port": 55555,
                    "status": "ESTABLISHED",
                }
            ],
            "total_count": 1,
            "timestamp": 0,
        }
        analysis = agent.analyze(observation)
        agent.act(analysis)

        alerts = []
        while not agent.alert_queue.empty():
            alerts.append(agent.alert_queue.get_nowait())

        suspicious = [a for a in alerts if a["type"] == "suspicious_network"]
        assert len(suspicious) >= 1, f"Expected suspicious_network alert, got: {alerts}"

    def test_netstat_addr_parsing(self, agent):
        """Verify macOS netstat address parsing."""
        assert NetworkAgent._parse_netstat_addr("10.0.0.1.443") == ("10.0.0.1", 443)
        assert NetworkAgent._parse_netstat_addr("*.443") == (None, 443)
        assert NetworkAgent._parse_netstat_addr("*.*") == (None, None)
        assert NetworkAgent._parse_netstat_addr("::1.993") == ("::1", 993)
