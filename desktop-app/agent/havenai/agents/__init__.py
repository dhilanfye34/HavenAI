"""
HavenAI Agents Package

This package contains all the AI agents that make up the HavenAI system:

- FileAgent: Monitors file system for suspicious downloads
- ProcessAgent: Monitors running processes for suspicious activity
- NetworkAgent: Monitors network connections for suspicious traffic
- EmailInboxAgent: Monitors inbox for phishing-like messages
- MessageAgent: Sends alert notifications via email/SMS/voice
- Coordinator: Orchestrates all agents and correlates findings
"""

from .base import Agent
from .file_agent import FileAgent
from .process_agent import ProcessAgent
from .network_agent import NetworkAgent
from .email_inbox_agent import EmailInboxAgent
from .message_agent import MessageAgent
from .coordinator import Coordinator

__all__ = [
    'Agent',
    'FileAgent',
    'ProcessAgent',
    'NetworkAgent',
    'EmailInboxAgent',
    'MessageAgent',
    'Coordinator'
]
