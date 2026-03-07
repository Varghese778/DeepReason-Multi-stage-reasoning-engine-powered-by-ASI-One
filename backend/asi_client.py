"""ASI:One API client with streaming support and exponential-backoff retry.

Handles both streaming and non-streaming calls to the ASI:One chat completions
endpoint, capturing content tokens, reasoning/thought traces, and usage stats.
"""

from __future__ import annotations

import json
import logging
import os
import time
from collections.abc import AsyncGenerator
from typing import Any
from dotenv import load_dotenv
load_dotenv()

import httpx
from tenacity import (
    RetryError,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from models import PipelineEvent

logger = logging.getLogger("asi_client")

_API_KEY: str = os.environ.get("ASI_ONE_API_KEY", "")
if not _API_KEY:
    raise RuntimeError("ASI_ONE_API_KEY environment variable is not set")

_BASE_URL = "https://api.asi1.ai/v1"
_TIMEOUT = httpx.Timeout(120.0)
_HEADERS = {
    "Authorization": f"Bearer {_API_KEY}",
    "Content-Type": "application/json",
}


def now_ms() -> int:
    return int(time.time() * 1000)


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in {429, 500, 502, 503, 504}
    return isinstance(exc, httpx.TimeoutException)


async def call_asi(
    stage: str,
    messages: list[dict],
    session_id: str,
    stream: bool = False,
) -> AsyncGenerator[PipelineEvent, None]:
    """Call ASI:One API and yield PipelineEvent objects.

    Yields token, thought, stage_complete, and error events.
    Retries up to 3 times on transient HTTP errors (429, 5xx).
    """
    collected_tokens: list[str] = []
    collected_content: list[str] = []
    thought_buf: list[str] = [""]
    prompt_tokens: list[int] = [0]
    completion_tokens: list[int] = [0]
    start_ms = now_ms()

    def _before_sleep(retry_state: Any) -> None:
        exc = retry_state.outcome.exception()
        logger.warning(
            "stage=%s attempt=%d error_type=%s",
            stage,
            retry_state.attempt_number,
            type(exc).__name__,
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=4),
        retry=retry_if_exception(_is_retryable),
        before_sleep=_before_sleep,
        reraise=True,
    )
    async def _make_call() -> None:
        collected_tokens.clear()
        collected_content.clear()
        thought_buf[0] = ""

        body: dict = {
            "model": "asi1",
            "messages": messages,
            "stream": stream,
            "max_tokens": 4096,
        }

        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            if stream:
                async with client.stream(
                    "POST",
                    f"{_BASE_URL}/chat/completions",
                    json=body,
                    headers=_HEADERS,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        usage = chunk.get("usage") or {}
                        if usage:
                            prompt_tokens[0] = usage.get("prompt_tokens", 0)
                            completion_tokens[0] = usage.get("completion_tokens", 0)

                        choices = chunk.get("choices") or []
                        if not choices:
                            continue

                        choice = choices[0]
                        delta = choice.get("delta") or {}

                        delta_text = delta.get("content") or ""
                        if delta_text:
                            collected_tokens.append(delta_text)
                            collected_content.append(delta_text)

                        delta_thought = (
                            delta.get("thought")
                            or delta.get("reasoning_content")
                            or ""
                        )
                        if delta_thought:
                            thought_buf[0] += delta_thought

                        message = choice.get("message") or {}
                        if message:
                            msg_thought = (
                                message.get("thought")
                                or message.get("reasoning_content")
                                or ""
                            )
                            if msg_thought:
                                thought_buf[0] = msg_thought
            else:
                response = await client.post(
                    f"{_BASE_URL}/chat/completions",
                    json=body,
                    headers=_HEADERS,
                )
                response.raise_for_status()
                data = response.json()

                message = data["choices"][0]["message"]
                collected_content.append(message.get("content") or "")
                thought_buf[0] = (
                    message.get("thought")
                    or message.get("reasoning_content")
                    or ""
                )

                usage = data.get("usage") or {}
                prompt_tokens[0] = usage.get("prompt_tokens", 0)
                completion_tokens[0] = usage.get("completion_tokens", 0)

    try:
        await _make_call()
    except (RetryError, Exception) as exc:
        latency_ms = now_ms() - start_ms
        logger.error("stage=%s final_failure error=%s", stage, str(exc))
        logger.info(
            "stage=%s latency_ms=%d prompt_tokens=%d completion_tokens=%d",
            stage,
            latency_ms,
            prompt_tokens[0],
            completion_tokens[0],
        )
        yield PipelineEvent(
            event_type="error",
            stage=stage,
            payload=json.dumps({"error": str(exc)}),
            timestamp_ms=now_ms(),
        )
        return

    latency_ms = now_ms() - start_ms
    logger.info(
        "stage=%s latency_ms=%d prompt_tokens=%d completion_tokens=%d",
        stage,
        latency_ms,
        prompt_tokens[0],
        completion_tokens[0],
    )

    for token_text in collected_tokens:
        yield PipelineEvent(
            event_type="token",
            stage=stage,
            payload=token_text,
            timestamp_ms=now_ms(),
        )

    if thought_buf[0]:
        yield PipelineEvent(
            event_type="thought",
            stage=stage,
            payload=thought_buf[0],
            timestamp_ms=now_ms(),
        )
    else:
        full_content = "".join(collected_content)
        if full_content:
            yield PipelineEvent(
                event_type="thought",
                stage=stage,
                payload="Response summary: " + full_content,
                timestamp_ms=now_ms(),
            )

    yield PipelineEvent(
        event_type="stage_complete",
        stage=stage,
        payload="".join(collected_content),
        timestamp_ms=now_ms(),
    )
