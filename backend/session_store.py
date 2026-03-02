"""In-memory session store with TTL-based expiry.

Stores SessionState objects keyed by session_id. A background task in main.py
periodically calls cleanup_expired() to remove stale sessions.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from models import SessionState

_store: dict[str, SessionState] = {}


async def save_session(session_id: str, state: SessionState) -> None:
    _store[session_id] = state


async def get_session(session_id: str) -> SessionState | None:
    return _store.get(session_id)


async def delete_session(session_id: str) -> None:
    _store.pop(session_id, None)


async def cleanup_expired(ttl_minutes: int) -> int:
    now = datetime.now(timezone.utc)
    cutoff = timedelta(minutes=ttl_minutes)
    expired: list[str] = []
    for session_id, state in _store.items():
        created = state.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if (now - created) > cutoff:
            expired.append(session_id)
    for session_id in expired:
        _store.pop(session_id, None)
    return len(expired)
