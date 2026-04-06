"""
Chat Routes

Streams assistant responses from OpenAI for the dashboard chatbot.
Supports persistent conversation threads and rich security context injection.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator, Optional

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
from sqlalchemy.orm import Session

from app.config import settings
from app.db.database import get_db
from app.db.models import Alert, Conversation, ConversationMessage, User
from app.dependencies import get_current_user
from app.schemas import ChatRequest, ConversationListResponse, ConversationResponse

router = APIRouter()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are the security assistant for HavenAI, a personal cybersecurity app. "
    "You help non-technical users understand their security status. "
    "You have access to data from three monitoring agents: "
    "File Monitor (watches Downloads and Desktop for suspicious files), "
    "Process Monitor (watches for suspicious process activity), "
    "and Network Monitor (watches network connections). "
    "You also have access to Email Inbox scanning results. "
    "When agent data is provided in context, use it to give specific, actionable advice. "
    "Always explain things simply — no jargon, no acronyms. "
    "If you don't have data about something, say so honestly. "
    "When runtime telemetry/context events are provided, treat them as "
    "authoritative current data from local monitors. Do not claim you lack access if that context "
    "is present; instead summarize the provided process/file/network data and cite what is known "
    "vs unknown."
)


def _build_alert_summary(db: Session, user_id: str) -> Optional[str]:
    """Build a brief alert summary for the last 24 hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    try:
        alerts = (
            db.query(Alert)
            .filter(Alert.user_id == user_id, Alert.created_at >= cutoff)
            .all()
        )
        if not alerts:
            return None

        by_severity: dict[str, int] = {}
        by_type: dict[str, int] = {}
        for a in alerts:
            by_severity[a.severity] = by_severity.get(a.severity, 0) + 1
            by_type[a.type] = by_type.get(a.type, 0) + 1

        parts = [f"Last 24 hours: {len(alerts)} alert(s)."]
        if by_severity:
            parts.append("By severity: " + ", ".join(f"{k}: {v}" for k, v in by_severity.items()))
        if by_type:
            most_common = max(by_type, key=by_type.get)
            parts.append(f"Most common type: {most_common} ({by_type[most_common]})")

        return " ".join(parts)
    except Exception as e:
        logger.debug("Failed to build alert summary: %s", e)
        return None


def _build_messages(
    chat_request: ChatRequest,
    db: Optional[Session] = None,
    user_id: Optional[str] = None,
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Inject alert summary context from database
    if db and user_id:
        alert_summary = _build_alert_summary(db, user_id)
        if alert_summary:
            messages.append({
                "role": "system",
                "content": f"Alert summary: {alert_summary}",
            })

    # Inject runtime context events (expanded from 8 to 20)
    if chat_request.context_events:
        event_lines: list[str] = []
        for event in chat_request.context_events[-20:]:
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


def _load_conversation_messages(
    db: Session, conversation_id: str, user_id: str
) -> Optional[list[dict[str, str]]]:
    """Load prior messages from a persisted conversation."""
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
        .first()
    )
    if not conv:
        return None

    return [
        {"role": msg.role, "content": msg.content}
        for msg in conv.messages
    ]


def _save_conversation_messages(
    db: Session,
    user_id: str,
    conversation_id: Optional[str],
    user_content: str,
    assistant_content: str,
) -> str:
    """Save user + assistant messages to a conversation. Creates one if needed.
    Returns the conversation_id."""
    if conversation_id:
        conv = (
            db.query(Conversation)
            .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
            .first()
        )
    else:
        conv = None

    if not conv:
        title = user_content[:80].strip() if user_content else "New conversation"
        conv = Conversation(user_id=user_id, title=title)
        db.add(conv)
        db.flush()

    db.add(ConversationMessage(
        conversation_id=conv.id, role="user", content=user_content
    ))
    db.add(ConversationMessage(
        conversation_id=conv.id, role="assistant", content=assistant_content
    ))
    db.commit()
    return conv.id


@router.post("/stream")
async def stream_chat(
    chat_request: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Stream a chat completion as Server-Sent Events.
    Optionally persists to a conversation thread.
    """
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured on the backend",
        )

    # If a conversation_id was provided, load prior history
    if chat_request.conversation_id:
        prior = _load_conversation_messages(db, chat_request.conversation_id, user.id)
        if prior:
            # Prepend persisted history before the new messages
            chat_request.messages = [
                type(chat_request.messages[0])(role=m["role"], content=m["content"])
                for m in prior
            ] + list(chat_request.messages)

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    model_name = chat_request.model or "gpt-4o-mini"
    messages = _build_messages(chat_request, db=db, user_id=user.id)

    # Capture the last user message for persistence
    last_user_msg = ""
    for m in reversed(chat_request.messages):
        if m.role == "user":
            last_user_msg = m.content
            break

    # We need to capture state across the async generator and the persistence step
    user_id = user.id
    conversation_id = chat_request.conversation_id

    async def event_stream() -> AsyncGenerator[str, None]:
        accumulated_response = []
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
                    accumulated_response.append(delta)
                    yield f"data: {json.dumps({'type': 'token', 'content': delta})}\n\n"

            # Persist conversation after streaming completes
            full_response = "".join(accumulated_response)
            if last_user_msg and full_response:
                try:
                    saved_id = _save_conversation_messages(
                        db, user_id, conversation_id, last_user_msg, full_response
                    )
                    yield f"data: {json.dumps({'type': 'done', 'conversation_id': saved_id})}\n\n"
                except Exception as e:
                    logger.warning("Failed to persist conversation: %s", e)
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
            else:
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


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 20,
):
    """List the user's recent conversation threads."""
    convs = (
        db.query(Conversation)
        .filter(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
        .all()
    )
    return ConversationListResponse(
        conversations=[
            ConversationResponse(
                id=c.id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in convs
        ],
        total=len(convs),
    )
