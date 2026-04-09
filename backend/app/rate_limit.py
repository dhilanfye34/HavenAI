"""
Rate limiting — shared slowapi Limiter instance.

Keyed by client IP. In-memory storage is fine for single-process deployments
(Render single-instance); switch to redis:// if you scale out horizontally.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
