"""
HavenAI Agents Package

This package contains all the AI agents that make up the HavenAI system:

- FileAgent: Monitors file system for suspicious downloads
- ProcessAgent: Monitors running processes for suspicious activity
- NetworkAgent: Monitors network connections for suspicious traffic
- Coordinator: Orchestrates all agents and correlates findings
"""

from .base import Agent
from .file_agent import FileAgent
from .process_agent import ProcessAgent
from .network_agent import NetworkAgent
from .coordinator import Coordinator

__all__ = [
    'Agent',
    'FileAgent',
    'ProcessAgent', 
    'NetworkAgent',
    'Coordinator'
]
