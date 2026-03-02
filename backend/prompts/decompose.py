from __future__ import annotations

import re


def _sanitise(text: str, max_len: int = 1000) -> str:
    text = text[:max_len]
    text = re.sub(r'[<>&{}"\']', "", text)
    return text.strip()


def build_prompt(question: str, domain: str, depth: int) -> str:
    q = _sanitise(question)
    d = _sanitise(domain, max_len=64)

    prompt = (
        f"<s>\n"
        f"You are a precision decomposition engine. Your sole job is to break a complex "
        f"question into exactly {depth} sub-questions that together fully cover the original "
        f"question. You must output ONLY valid JSON. No preamble. No markdown fences.\n"
        f"</s>\n"
        f"<task>\n"
        f"Original question: {q}\n"
        f"Domain context: {d}\n"
        f"Required number of sub-questions: {depth}\n"
        f"\n"
        f"Output ONLY a valid JSON object matching this exact schema:\n"
        f"{{\n"
        f'  "sub_questions": [\n'
        f"    {{\n"
        f'      "id": "sq1",\n'
        f'      "question": "...",\n'
        f'      "depends_on": [],\n'
        f'      "domain_tags": ["...", "..."]\n'
        f"    }}\n"
        f"  ],\n"
        f'  "reasoning_about_decomposition": "..."\n'
        f"}}\n"
        f"\n"
        f"Output ONLY the JSON object above. Exactly {depth} sub_questions. No other text.\n"
        f"</task>"
    )
    return prompt.rstrip()
