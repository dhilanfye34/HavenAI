"""
Chat Routes

Streams assistant responses from OpenAI for the dashboard chatbot.
"""

import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    BadRequestError,
    NotFoundError,
    RateLimitError,
)

from app.config import settings
from app.db.models import User
from app.dependencies import get_current_user
from app.schemas import ChatRequest

router = APIRouter()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are the central command assistant for HavenAI, an AI-powered cybersecurity platform. "
    "You have access to information from the following security agents: Network Monitor, "
    "File Integrity Watcher, Process Analyzer, Threat Intelligence, and Vulnerability Scanner. "
    "You help the user understand their security posture, explain alerts, provide recommendations, "
    "and answer general cybersecurity questions. Keep responses clear and non-technical unless the "
    "user asks for details. When runtime telemetry/context events are provided, treat them as "
    "authoritative current data from local monitors. Do not claim you lack access if that context "
    "is present; instead summarize the provided process/file/network data and cite what is known "
    "vs unknown."
)


def _build_messages(chat_request: ChatRequest) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if chat_request.context_events:
        event_lines: list[str] = []
        for event in chat_request.context_events[-8:]:
            event_lines.append(
                f"- source={event.source}; severity={event.severity or 'n/a'}; "
                f"time={event.timestamp or 'n/a'}; detail={event.description}"
            )
        messages.append(
            {
                "role": "system",
                "content": "Recent security context from agents:\n" + "\n".join(event_lines),
            }
        )

    for message in chat_request.messages:
        messages.append({"role": message.role, "content": message.content})

    return messages


def _candidate_models(requested_model: str) -> list[str]:
    candidates = [requested_model, "gpt-4o-mini", "gpt-4o"]
    unique: list[str] = []
    for candidate in candidates:
        if candidate not in unique:
            unique.append(candidate)
    return unique


@router.post("/stream")
async def stream_chat(
    chat_request: ChatRequest,
    user: User = Depends(get_current_user),
):
    """
    Stream a chat completion as Server-Sent Events.
    """
    _ = user  # Keep auth dependency explicit for protected access.

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured on the backend",
        )

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    model_name = chat_request.model or "gpt-4o-mini"
    messages = _build_messages(chat_request)

    async def event_stream() -> AsyncGenerator[str, None]:
        models_to_try = _candidate_models(model_name)
        try:
            stream = None
            for candidate_model in models_to_try:
                try:
                    stream = await client.chat.completions.create(
                        model=candidate_model,
                        messages=messages,
                        stream=True,
                        temperature=0.35,
                    )
                    break
                except (NotFoundError, BadRequestError) as model_error:
                    error_text = str(model_error).lower()
                    is_model_issue = (
                        "model" in error_text
                        and (
                            "not found" in error_text
                            or "does not exist" in error_text
                            or "unsupported" in error_text
                        )
                    )
                    if is_model_issue and candidate_model != models_to_try[-1]:
                        logger.warning(
                            "Model %s unavailable, retrying with fallback.",
                            candidate_model,
                        )
                        continue
                    raise

            if stream is None:
                raise RuntimeError("No available model for chat streaming.")

            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'type': 'token', 'content': delta})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except AuthenticationError:
            logger.exception("OpenAI authentication failed")
            yield f"data: {json.dumps({'type': 'error', 'message': 'OpenAI authentication failed on backend.'})}\n\n"
        except RateLimitError:
            logger.exception("OpenAI rate limited")
            yield f"data: {json.dumps({'type': 'error', 'message': 'OpenAI rate limit hit. Please retry in a moment.'})}\n\n"
        except (APIConnectionError, APITimeoutError):
            logger.exception("OpenAI network/timeout error")
            yield f"data: {json.dumps({'type': 'error', 'message': 'OpenAI connection timed out or failed.'})}\n\n"
        except APIStatusError as status_error:
            logger.exception("OpenAI API status error")
            yield f"data: {json.dumps({'type': 'error', 'message': f'OpenAI API error ({status_error.status_code}).'})}\n\n"
        except Exception as error:
            logger.exception("Chat stream failed")
            message = str(error).strip() or "Chat stream failed."
            yield f"data: {json.dumps({'type': 'error', 'message': message[:300]})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
