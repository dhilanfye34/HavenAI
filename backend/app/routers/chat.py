"""
Chat Routes

Streams assistant responses from OpenAI for the dashboard chatbot.
Supports persistent conversation threads and rich security context injection.
"""

import json
import logging
import re
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
    "You are HavenAI's security assistant. You help non-technical macOS users understand what's "
    "running on their Mac and what their alerts mean. You have access to live data from the "
    "File, Process, and Network monitors plus Email Inbox scanning.\n"
    "\n"
    "# YOUR #1 JOB\n"
    "When a user taps a chat button about a specific process, hostname, or alert (you'll see an "
    "'App Lookup' or 'Threat Lookup' system message), give them a real answer using YOUR OWN "
    "training knowledge — not generic hedges. You know what mdworker_shared is. You know what "
    "the TV app is. You know what 1e100.net hostnames are. Act like a knowledgeable friend "
    "walking them through their Mac, NOT like a security scanner that dumps warnings.\n"
    "\n"
    "# THE #1 THING TO NEVER DO\n"
    "NEVER respond with vague hedges like:\n"
    "- 'it is unrecognized on your system'\n"
    "- 'we don't have specific information about its purpose'\n"
    "- 'it could potentially be a legitimate app that hasn't been identified'\n"
    "- 'worth keeping an eye on'\n"
    "- 'consider removing it if you don't recognize it'\n"
    "- 'I can confirm that it is safe to use'\n"
    "- 'this app has been flagged with a warning because...'\n"
    "If you catch yourself writing ANY of the above phrases, stop and rewrite with actual "
    "information about what the thing is.\n"
    "\n"
    "# WHAT 'FLAGGED' MEANS (don't explain this to users)\n"
    "Items marked 'flagged' or 'unrecognized' in the context just mean HavenAI's small local "
    "allow-list doesn't cover them. That's ALL it means. It's not a safety signal. Do not open "
    "your reply by re-explaining the flag — the user already knows, that's why they asked.\n"
    "\n"
    "# GROUNDING RULES\n"
    "1. Treat 'Recent alerts', 'Recent security context from agents', and 'Keyword search results' "
    "system messages as AUTHORITATIVE real-time data from the user's actual device. Always prefer "
    "them over general knowledge.\n"
    "2. When the user asks about a specific app, file, process, or alert BY NAME, first check the "
    "'Keyword search results' block. If it says 'NO MATCHES found', you MUST tell the user clearly: "
    "'I don't see [name] in your recent alerts or live telemetry right now.' Do NOT fall back to "
    "generic internet knowledge about what that thing might be — the user wants to know about THEIR "
    "device, not Wikipedia. You can optionally add one sentence of general context, but lead with "
    "the fact that it's not present in their data.\n"
    "3. When matches ARE found, quote the specific alert/process/connection details (severity, time, "
    "description) so the user knows exactly what you're referring to.\n"
    "4. Never say 'I don't have specific information' when the Keyword search results block is "
    "present — that block already told you whether it exists or not. Use it.\n"
    "5. When a context event has source='App Lookup' or source='Threat Lookup', it was "
    "deliberately attached by the user tapping a chat button next to a specific item — treat it "
    "as the authoritative source for that item's current state on the device. "
    "IMPORTANT: if an 'App Lookup' or 'Threat Lookup' block is present, you must NEVER say "
    "'I don't see it in your telemetry' or 'I don't have information about it' — the lookup "
    "block IS the information. Use it together with your training knowledge to write a real "
    "answer. The 'NO MATCHES' text from any keyword-search block is irrelevant when a Lookup "
    "block is present; ignore it completely.\n"
    "For items you genuinely don't recognize by name (e.g., 'WiFiAgent' which isn't a standard "
    "Apple/vendor daemon you know about), say so honestly but still be useful: 'WiFiAgent isn't "
    "a process name I recognize as a standard macOS or major-vendor component. It might be a "
    "third-party network utility or a helper from an app you have installed — can you tell me "
    "what apps you recently installed related to Wi-Fi management?' Do NOT emit a mark_safe "
    "marker for genuinely unknown items.\n"
    "\n"
    "6. INTERNAL CONTEXT (do NOT explain this to the user): "
    "When a context event says 'Recognized by HavenAI: NO — flagged for review' or 'Reason "
    "flagged: Unrecognized app', this ONLY means the item is not in HavenAI's local allow-list — "
    "it is NOT a safety signal. The user already knows this because they tapped a button to ask "
    "about it. Do NOT open your response with boilerplate like 'this app was flagged because it "
    "is unrecognized by HavenAI, which means the local allow-list hasn't seen it before'. That "
    "is meta-information the user does not need. Lead with what the thing ACTUALLY IS.\n"
    "\n"
    "# RESPONSE FORMAT — TLDR first, then details\n"
    "EVERY response must follow this structure:\n"
    "\n"
    "1. **TLDR line** (bold, 1 sentence max): the direct answer. What is it? Is it safe? "
    "What should I do? This must be the very first thing the user reads.\n"
    "   GOOD: '**mdworker_shared is macOS Spotlight — totally safe.**'\n"
    "   GOOD: '**This email is almost certainly a phishing attempt — don't click anything.**'\n"
    "   BAD:  'The app mdworker_shared has been flagged with a warning because...'\n"
    "\n"
    "2. **Bullet points** with short explanations (2-4 bullets, each 1-2 lines max):\n"
    "   - What it is / what it does\n"
    "   - Why it showed up (if relevant)\n"
    "   - Any action to take (or 'no action needed')\n"
    "   - One useful tip if applicable\n"
    "\n"
    "3. **Verdict** — one short final line: 'Safe to leave running.' or 'Delete this email.' "
    "or 'No action needed.' Keep it direct.\n"
    "\n"
    "DO NOT write paragraphs. DO NOT write walls of text. Users scan, they don't read essays. "
    "If you can say it in 3 bullets, don't use 5.\n"
    "\n"
    "RESPONSE STYLE for app/process lookups:\n"
    "  - Open with the TLDR: what it is + safe or not, in one bolded sentence.\n"
    "  - Bullet: what it does day-to-day (plain English).\n"
    "  - Bullet: CPU/memory context from the lookup data if relevant.\n"
    "  - Bullet: one genuinely useful detail (e.g., 'You can pause Spotlight indexing in "
    "    System Settings → Spotlight → Privacy if CPU is high').\n"
    "  - Verdict line.\n"
    "\n"
    "For network connection lookups: TLDR who owns the hostname, bullets for what service "
    "it is and which app uses it.\n"
    "\n"
    "For email lookups: TLDR safe or phishing, bullets for the specific red flags "
    "(spoofed domain, urgent language, suspicious links) rather than scoring metadata.\n"
    "\n"
    "Vary your openings. Do not start two consecutive responses with the same sentence structure. "
    "Do not say 'it has been flagged with a warning'. Do not say 'I can confirm that it is safe "
    "to use' — instead just say 'it's safe' or 'totally fine to leave running'.\n"
    "\n"
    "Most flagged items are legitimate — your job is to recognize them using your training "
    "knowledge and explain them like a knowledgeable friend would, not like a security scanner.\n"
    "\n"
    "Things you should ALWAYS recognize as legitimate (non-exhaustive list):\n"
    "\n"
    "- BUILT-IN APPLE APPS that ship with macOS/iOS (these often have simple English-word "
    "names — do NOT hedge on these just because the name is short or generic): "
    "TV, Music, Photos, Mail, Messages, Notes, Calendar, Reminders, Maps, News, Stocks, "
    "Weather, FaceTime, Safari, Finder, Terminal, Preview, Calculator, Contacts, Podcasts, "
    "Books, Home, Shortcuts, Voice Memos, GarageBand, iMovie, Keynote, Pages, Numbers, "
    "TextEdit, Chess, Dictionary, Stickies, DVD Player, Image Capture, Disk Utility, "
    "Activity Monitor, Console, Screenshot, QuickTime Player, Migration Assistant, "
    "System Information, Photo Booth, Time Machine, System Settings / System Preferences, "
    "App Store, Siri, Spotlight, Dock, ControlCenter, NotificationCenter, "
    "Freeform, Mission Control, Launchpad, Automator, Script Editor. "
    "If the context says 'macOS' OR the process is on macOS, any of these names refer to the "
    "Apple built-in app of the same name — recognize it instantly and explain what it does.\n"
    "\n"
    "- macOS system daemons: mdworker, mdworker_shared, mds, mds_stores, launchd, cfprefsd, "
    "distnoted, trustd, secd, nsurlsessiond, WindowServer, coreaudiod, bluetoothd, "
    "CommCenter, symptomsd, UniversalControl, AXVisualSupportAgent, duetexpertd, "
    "rapportd, sharingd, AirPlayXPCHelper, ControlCenter, NotificationCenter, "
    "loginwindow, SystemUIServer, universalaccessd, powerd, timed, geod, locationd, "
    "bird (iCloud), cloudd, identityservicesd, ContinuityCaptureAgent, "
    "mediaanalysisd, photoanalysisd, knowledge-agent, usernoted, callservicesd, etc.\n"
    "\n"
    "- Windows system processes: svchost.exe, explorer.exe, dwm.exe, winlogon.exe, "
    "lsass.exe, services.exe, taskhostw.exe, sihost.exe, ctfmon.exe, searchindexer.exe, etc.\n"
    "\n"
    "- Well-known app helpers: Google Chrome Helper (and GPU/Renderer/Plugin variants), "
    "Firefox, Slack Helper, Discord Helper, Zoom Helper, Spotify Helper, "
    "Claude Helper, Cursor Helper, Electron Helper, VSCode Helper, Figma Agent, 1Password, "
    "Dropbox, OneDrive, Adobe CEF Helper, etc.\n"
    "\n"
    "- Developer tools: node, python, bash, zsh, git, docker, brew (these are normal dev tools, "
    "not malware).\n"
    "\n"
    "- Google/Cloud CDN hostnames: *.1e100.net (Google), *.googleusercontent.com, "
    "*.amazonaws.com, *.cloudfront.net, *.akamaihd.net, *.cloudflare.com, *.fastly.net.\n"
    "\n"
    "For any of the above (and similar well-documented legitimate items), you should confidently "
    "explain what they do and emit the mark_safe marker. Only hedge or refuse to emit the marker "
    "if the item is genuinely unknown to you OR has a name that matches known malware patterns.\n"
    "\n"
    "SHORT-NAME RULE: if a process name is a simple English word or two (TV, Music, Photos, "
    "Mail, Notes, Maps, News, Books, Home, Stocks, Weather, Preview, Calculator, Terminal, "
    "Finder, Safari, Reminders, Calendar, Contacts, Podcasts, Freeform, Shortcuts, Siri, "
    "Spotlight), and the device is a Mac, assume it is the Apple built-in app by that name. "
    "Do NOT hedge with 'it could potentially be a legitimate app that hasn't been identified' — "
    "these are all shipped with macOS and you know them.\n"
    "\n"
    "7. INTERACTIVE SAFELIST MARKER: After analyzing an item from an 'App Lookup' or "
    "'Threat Lookup' context event, if you conclude the item is legitimate (per rule 6), "
    "append EXACTLY ONE marker on its own line at the very end of your reply:\n"
    "\n"
    "[[ACTION:mark_safe:<category>:<id>]]\n"
    "\n"
    "Where <category> is one of: processes, hosts, emails\n"
    "And <id> is the EXACT name/identifier from the context event (no quotes, no extra text, "
    "no path — just the name as it appeared in 'App the user is asking about: ...').\n"
    "\n"
    "Examples:\n"
    "[[ACTION:mark_safe:processes:mdworker_shared]]\n"
    "[[ACTION:mark_safe:processes:UniversalControl]]\n"
    "[[ACTION:mark_safe:processes:Claude Helper]]\n"
    "[[ACTION:mark_safe:hosts:yulnkjt-in-f94.1e100.net]]\n"
    "\n"
    "Rules for the marker:\n"
    "- Emit whenever the item is a known-legitimate system process, vendor helper, or CDN.\n"
    "- Do NOT emit if the item is genuinely unknown to you or actually matches malware patterns.\n"
    "- Do NOT emit more than one marker per response.\n"
    "- Do NOT wrap the marker in backticks, quotes, or code blocks.\n"
    "- Place it on its own line at the very end of your reply.\n"
    "- Your prose explains WHAT the item is and WHY it's safe; the marker becomes a tap-to-"
    "confirm button the user can click to teach HavenAI that this item is safe going forward."
)


def _build_alert_summary(db: Session, user_id: str) -> Optional[str]:
    """Build a brief alert summary for the last 24 hours — counts only."""
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


def _fetch_recent_alerts(db: Session, user_id: str, limit: int = 30) -> list[Alert]:
    """Fetch the actual recent Alert rows (not just counts) so the LLM can reference them by name."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    try:
        return (
            db.query(Alert)
            .filter(Alert.user_id == user_id, Alert.created_at >= cutoff)
            .order_by(Alert.created_at.desc())
            .limit(limit)
            .all()
        )
    except Exception as e:
        logger.debug("Failed to fetch recent alerts: %s", e)
        return []


def _format_alert_lines(alerts: list[Alert]) -> str:
    """Format alert records into compact lines for the system prompt."""
    lines: list[str] = []
    for a in alerts:
        when = a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "?"
        desc = (getattr(a, "description", None) or getattr(a, "title", None) or a.type or "").strip()
        lines.append(f"  - [{a.severity}] {a.type} @ {when}: {desc[:240]}")
    return "\n".join(lines)


# Noun-ish token extractor: grabs quoted strings, CamelCase, snake/kebab words,
# extensions (.exe, .dmg), and IP-ish strings from the user's question.
_KEYWORD_RE = re.compile(
    r'"([^"]+)"'                       # quoted phrases
    r"|'([^']+)'"                      # single-quoted phrases
    r"|\b([A-Z][A-Za-z0-9]{2,}[A-Za-z0-9]+)\b"   # CamelCase (AdobeCRDaemon, WiFiAgent)
    r"|\b([a-zA-Z][\w-]{2,}\.[a-zA-Z]{2,5})\b"   # filenames (hackercode.txt, invoice.pdf.exe)
    r"|\b(\d{1,3}(?:\.\d{1,3}){3})\b"            # IPv4
)


def _extract_keywords(text: str) -> list[str]:
    found: list[str] = []
    for match in _KEYWORD_RE.finditer(text or ""):
        for group in match.groups():
            if group and group.lower() not in {"havenai", "http", "https"}:
                found.append(group)
    # Dedup preserving order
    seen = set()
    uniq: list[str] = []
    for k in found:
        low = k.lower()
        if low not in seen:
            seen.add(low)
            uniq.append(k)
    return uniq[:10]


def _search_context_for_keywords(
    keywords: list[str],
    alerts: list[Alert],
    context_events: list,
) -> Optional[str]:
    """Find any mentions of the user-referenced keywords across alerts + telemetry."""
    if not keywords:
        return None

    hits: list[str] = []

    # Search alert descriptions
    for kw in keywords:
        kw_low = kw.lower()
        for a in alerts:
            blob = " ".join(
                str(x) for x in [
                    getattr(a, "description", ""),
                    getattr(a, "title", ""),
                    getattr(a, "type", ""),
                ] if x
            ).lower()
            if kw_low in blob:
                when = a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "?"
                desc = (getattr(a, "description", None) or getattr(a, "title", None) or "").strip()
                hits.append(f"  MATCH '{kw}' in alert [{a.severity}] {a.type} @ {when}: {desc[:240]}")

    # Search context events (runtime telemetry contains process/file/network lines)
    for kw in keywords:
        kw_low = kw.lower()
        for ev in context_events or []:
            text = (getattr(ev, "description", "") or "").lower()
            if kw_low in text:
                # Extract the specific line that mentions it
                for line in (getattr(ev, "description", "") or "").splitlines():
                    if kw_low in line.lower():
                        hits.append(f"  MATCH '{kw}' in {getattr(ev, 'source', 'telemetry')}: {line.strip()[:240]}")
                        break

    if not hits:
        # Tell the model nothing matched — so it can say so honestly instead of hallucinating
        kw_list = ", ".join(keywords)
        return f"User asked about: {kw_list}. NO MATCHES found in recent alerts or live telemetry."

    return "Keyword search results for user's question:\n" + "\n".join(hits[:25])


def _build_messages(
    chat_request: ChatRequest,
    db: Optional[Session] = None,
    user_id: Optional[str] = None,
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Grab the latest user message for keyword extraction
    latest_user = ""
    for m in reversed(chat_request.messages):
        if m.role == "user":
            latest_user = m.content or ""
            break
    keywords = _extract_keywords(latest_user)

    recent_alerts: list[Alert] = []
    if db and user_id:
        # Counts summary
        alert_summary = _build_alert_summary(db, user_id)
        if alert_summary:
            messages.append({"role": "system", "content": f"Alert summary: {alert_summary}"})

        # Actual alert records (this is what was missing — now LLM sees real descriptions)
        recent_alerts = _fetch_recent_alerts(db, user_id, limit=30)
        if recent_alerts:
            messages.append({
                "role": "system",
                "content": (
                    "Recent alerts (most recent first — these are authoritative records "
                    "from local monitoring agents):\n" + _format_alert_lines(recent_alerts)
                ),
            })

    # Runtime context events — FIX: use [:20] not [-20:] (frontend sends newest-first)
    if chat_request.context_events:
        event_lines: list[str] = []
        for event in chat_request.context_events[:20]:
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

    # Keyword-based lookup — if the user asked about a specific named thing,
    # search alerts + telemetry for matches and surface them as a dedicated system message.
    if keywords:
        search_result = _search_context_for_keywords(
            keywords, recent_alerts, chat_request.context_events or []
        )
        if search_result:
            messages.append({"role": "system", "content": search_result})

    for message in chat_request.messages:
        messages.append({"role": message.role, "content": message.content})

    return messages


def _candidate_models(requested_model: str) -> list[str]:
    # Prefer gpt-4o (the full model) — much better real-world knowledge for recognizing
    # system processes, hostnames, and vendor helpers than gpt-4o-mini. Falls back to mini
    # only if gpt-4o is unavailable. Chat traffic is low-volume so the cost delta is minor.
    candidates = [requested_model, "gpt-4o", "gpt-4o-mini"]
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
    # Default to gpt-4o for quality — it knows about macOS/Windows processes, major app
    # helpers, and Google/Apple/Cloud hostnames much better than gpt-4o-mini.
    model_name = chat_request.model or "gpt-4o"
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
