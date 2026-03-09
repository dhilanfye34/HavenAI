"""
Chat Routes

Streams assistant responses from OpenAI for the dashboard chatbot.
"""

import json
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from app.config import settings
from app.db.models import User
from app.dependencies import get_current_user
from app.schemas import ChatRequest

router = APIRouter()

SYSTEM_PROMPT = (
    "You are the central command assistant for HavenAI, an AI-powered cybersecurity platform. "
    "You have access to information from the following security agents: Network Monitor, "
    "File Integrity Watcher, Process Analyzer, Threat Intelligence, and Vulnerability Scanner. "
    "You help the user understand their security posture, explain alerts, provide recommendations, "
    "and answer general cybersecurity questions. Keep responses clear and non-technical unless the "
    "user asks for details."
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
        try:
            stream = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                stream=True,
                temperature=0.35,
            )

            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'type': 'token', 'content': delta})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception:
            yield (
                f"data: {json.dumps({'type': 'error', 'message': 'Chat stream failed'})}\n\n"
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
