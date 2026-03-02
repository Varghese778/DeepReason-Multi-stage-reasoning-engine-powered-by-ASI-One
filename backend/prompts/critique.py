from __future__ import annotations

import re


def _sanitise(text: str, max_len: int = 1000) -> str:
    text = text[:max_len]
    text = re.sub(r'[<>&{}"\']', "", text)
    return text.strip()


def build_prompt(research_json: str) -> str:
    prompt = (
        f"<s>\n"
        f"You are a rigorous peer reviewer. Your job is to challenge and improve the "
        f"reasoning provided below. Be direct about weaknesses. Do not be sycophantic. "
        f"Do not defend the prior reasoning — your role is to find its flaws, biases, "
        f"and gaps. Output ONLY valid JSON. No preamble. No markdown fences.\n"
        f"</s>\n"
        f"<reasoning_to_critique>\n"
        f"{research_json}\n"
        f"</reasoning_to_critique>\n"
        f"\n"
        f"Output ONLY a valid JSON object matching this exact schema:\n"
        f"{{\n"
        f'  "logical_weaknesses": ["..."],\n'
        f'  "potential_biases": ["..."],\n'
        f'  "evidence_that_would_change_answer": "...",\n'
        f'  "revised_confidence": 1,\n'
        f'  "critique_summary": "..."\n'
        f"}}\n"
        f"\n"
        f"revised_confidence must be an integer from 1 to 10. No other text."
    )
    return prompt.rstrip()
