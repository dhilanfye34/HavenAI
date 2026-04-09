"""
Telemetry Routes

Anonymous crash/error reports from the desktop agent. This is the only
channel through which agent failures reach us — users aren't expected
to file issues manually.

Scope (what we accept):
- error_type, error_message, stack_trace
- agent_version, platform, python_version
- device_id (for dedup), user_id (optional, only if the agent is logged in)

Scope (what we DO NOT accept):
- file paths, URLs, process names, network destinations
- email content, IMAP credentials
- anything PII-shaped

Telemetry is rate-limited so a crash loop can't spam us.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter()


class AgentErrorReport(BaseModel):
    error_type: str = Field(max_length=200)
    error_message: str = Field(max_length=2000)
    stack_trace: Optional[str] = Field(default=None, max_length=10000)
    agent_version: Optional[str] = Field(default=None, max_length=50)
    platform: Optional[str] = Field(default=None, max_length=100)
    python_version: Optional[str] = Field(default=None, max_length=50)
    device_id: Optional[str] = Field(default=None, max_length=100)
    occurred_at: Optional[str] = Field(default=None, max_length=50)


@router.post("/error", status_code=202)
@limiter.limit("20/hour")
async def report_agent_error(request: Request, report: AgentErrorReport):
    """
    Anonymous crash report from the desktop agent. Always returns 202 Accepted
    so the agent never retries a report even if our logging pipeline is down.
    """
    # Log structured fields so we can grep / aggregate in the backend logs.
    # We intentionally do NOT write to the database — volume can spike during
    # a crash loop, and rotating log storage is cheaper than growing a table.
    logger.warning(
        "[AGENT_ERROR] type=%s version=%s platform=%s device=%s message=%s",
        report.error_type,
        report.agent_version or "unknown",
        report.platform or "unknown",
        report.device_id or "anon",
        report.error_message[:500],
    )
    if report.stack_trace:
        logger.warning("[AGENT_ERROR_TRACE] %s", report.stack_trace[:2000])

    return {"received_at": datetime.now(timezone.utc).isoformat()}
