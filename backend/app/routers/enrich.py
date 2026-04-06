"""
Alert Enrichment Routes

Uses LLM to enrich security alerts with plain-language explanations
and actionable recommendations for non-technical consumers.
"""

import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from openai import AsyncOpenAI, NotFoundError, BadRequestError

from app.config import settings
from app.db.models import User
from app.dependencies import get_current_user
from app.schemas import EnrichmentRequest, EnrichmentResponse

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple in-memory cache: (alert_type, severity, reasons_hash) -> (response, timestamp)
_enrichment_cache: dict[str, tuple[EnrichmentResponse, float]] = {}
_CACHE_TTL = 3600  # 1 hour

ENRICHMENT_SYSTEM_PROMPT = (
    "You are HavenAI's security analyst. Your job is to explain security alerts "
    "to regular, non-technical people. No jargon, no acronyms, no CVE numbers. "
    "Write like you're explaining to a friend who doesn't work in tech. "
    "Be specific and actionable — tell them exactly what to do."
)

EMAIL_ENRICHMENT_SYSTEM_PROMPT = (
    "You are HavenAI's email security analyst. Your job is to assess whether an "
    "email is a phishing attempt and explain your reasoning to a regular person. "
    "No jargon. Be specific about what makes it suspicious or safe."
)


def _build_enrichment_prompt(req: EnrichmentRequest) -> str:
    """Build the user prompt for alert enrichment."""
    details_str = ""
    if req.details:
        reasons = req.details.get("reasons", [])
        if reasons:
            details_str += f"\nDetection reasons: {', '.join(reasons)}"
        for key in ("filename", "extension", "process", "destination", "sender_domain", "subject"):
            if req.details.get(key):
                details_str += f"\n{key}: {req.details[key]}"

    baseline_str = ""
    if req.baseline_context:
        baseline_str = f"\nUser baseline context: {json.dumps(req.baseline_context)}"

    return (
        f"Alert type: {req.alert_type}\n"
        f"Severity: {req.severity}\n"
        f"Title: {req.title}\n"
        f"Description: {req.description or 'N/A'}\n"
        f"Risk score: {req.risk_score or 'N/A'}"
        f"{details_str}"
        f"{baseline_str}\n\n"
        "Respond in this exact JSON format:\n"
        '{\n'
        '  "explanation": "One or two sentences explaining what happened in plain language.",\n'
        '  "recommendation": "One specific, actionable thing the user should do.",\n'
        '  "confidence": 0.0 to 1.0 (how confident this is a real threat),\n'
        '  "false_positive_likelihood": 0.0 to 1.0 (how likely this is a false alarm)\n'
        '}'
    )


def _cache_key(req: EnrichmentRequest) -> str:
    """Generate a cache key from alert characteristics."""
    reasons = tuple(sorted(req.details.get("reasons", []))) if req.details else ()
    return f"{req.alert_type}:{req.severity}:{hash(reasons)}"


def _get_cached(key: str) -> Optional[EnrichmentResponse]:
    """Return cached enrichment if still valid."""
    if key in _enrichment_cache:
        resp, ts = _enrichment_cache[key]
        if time.time() - ts < _CACHE_TTL:
            return resp
        del _enrichment_cache[key]
    return None


@router.post("/alert", response_model=EnrichmentResponse)
async def enrich_alert(
    req: EnrichmentRequest,
    user: User = Depends(get_current_user),
):
    """Enrich a security alert with LLM-generated plain-language explanation."""
    _ = user

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured on the backend",
        )

    # Check cache
    key = _cache_key(req)
    cached = _get_cached(key)
    if cached:
        return cached

    # Choose system prompt based on alert type
    is_email = req.alert_type in ("phishing_email", "suspicious_email")
    system_prompt = EMAIL_ENRICHMENT_SYSTEM_PROMPT if is_email else ENRICHMENT_SYSTEM_PROMPT

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    user_prompt = _build_enrichment_prompt(req)

    models_to_try = ["gpt-4o-mini", "gpt-4o"]
    last_error = None

    for model in models_to_try:
        try:
            completion = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            content = completion.choices[0].message.content
            parsed = json.loads(content)

            response = EnrichmentResponse(
                explanation=parsed.get("explanation", "Unable to analyze this alert."),
                recommendation=parsed.get("recommendation", "Exercise caution."),
                confidence=max(0.0, min(1.0, float(parsed.get("confidence", 0.5)))),
                false_positive_likelihood=max(0.0, min(1.0, float(parsed.get("false_positive_likelihood", 0.5)))),
            )

            # Cache successful result
            _enrichment_cache[key] = (response, time.time())

            return response

        except (NotFoundError, BadRequestError) as e:
            error_text = str(e).lower()
            if "model" in error_text and model != models_to_try[-1]:
                logger.warning("Model %s unavailable for enrichment, trying fallback.", model)
                last_error = e
                continue
            raise HTTPException(status_code=500, detail=f"LLM error: {e}")
        except json.JSONDecodeError:
            logger.warning("LLM returned invalid JSON for enrichment, using fallback.")
            return EnrichmentResponse(
                explanation="We detected something unusual but couldn't generate a detailed analysis right now.",
                recommendation="Exercise caution and avoid interacting with the flagged item.",
                confidence=0.5,
                false_positive_likelihood=0.5,
            )
        except Exception as e:
            last_error = e
            logger.exception("Enrichment failed with model %s", model)
            if model != models_to_try[-1]:
                continue
            raise HTTPException(status_code=500, detail=f"Enrichment failed: {str(last_error)[:200]}")

    raise HTTPException(status_code=500, detail="All enrichment models failed.")
