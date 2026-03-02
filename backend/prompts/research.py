from __future__ import annotations

import re

_DOMAIN_FRAMES: dict[str, str] = {
    "startup": (
        "Apply startup strategy frameworks: TAM/SAM/SOM analysis, competitive moats, "
        "unit economics, go-to-market channels, and founder-market fit."
    ),
    "tech": (
        "Apply software engineering trade-off analysis: build vs buy, scalability, "
        "maintainability, time-to-market, technical debt, and operational complexity."
    ),
    "research": (
        "Apply academic rigour: hypothesis formation, evidence quality assessment, "
        "alternative explanations, methodological limitations, and citation of reasoning sources."
    ),
    "general": (
        "Apply structured first-principles thinking: break assumptions, consider "
        "second-order effects, identify stakeholders, and evaluate resource constraints."
    ),
}


def _sanitise(text: str, max_len: int = 1000) -> str:
    text = text[:max_len]
    text = re.sub(r'[<>&{}"\']', "", text)
    return text.strip()


def build_prompt(
    sq_id: str,
    question: str,
    parent_question: str,
    domain: str,
    web_context: str = "",
) -> str:
    sq = _sanitise(question)
    pq = _sanitise(parent_question)
    domain_frame = _DOMAIN_FRAMES.get(domain, _DOMAIN_FRAMES["general"])

    context_block = ""
    if web_context:
        context_block = f"<context>\n{web_context}\n</context>\n"

    prompt = (
        f"<s>\n"
        f"You are a rigorous analytical researcher. Reason through the sub-question below "
        f"using explicit chain-of-thought. Show your work step by step. After your reasoning, "
        f"identify exactly 3 assumptions you are most uncertain about. "
        f"Output ONLY valid JSON. No preamble. No markdown fences.\n"
        f"</s>\n"
        f"<domain_frame>\n"
        f"{domain_frame}\n"
        f"</domain_frame>\n"
        f"{context_block}"
        f"<parent_question>\n"
        f"{pq}\n"
        f"</parent_question>\n"
        f'<sub_question id="{sq_id}">\n'
        f"{sq}\n"
        f"</sub_question>\n"
        f"\n"
        f"Output ONLY a valid JSON object matching this exact schema:\n"
        f"{{\n"
        f'  "answer": "...",\n'
        f'  "chain_of_thought": ["step1", "step2", "..."],\n'
        f'  "top_3_uncertain_assumptions": [\n'
        f'    {{ "assumption": "...", "why_uncertain": "..." }}\n'
        f"  ],\n"
        f'  "confidence_raw": 1\n'
        f"}}\n"
        f"\n"
        f"confidence_raw must be an integer from 1 to 10. No other text."
    )
    return prompt.rstrip()
