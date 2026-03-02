from __future__ import annotations

import re


def _sanitise(text: str, max_len: int = 1000) -> str:
    text = text[:max_len]
    text = re.sub(r'[<>&{}"\']', "", text)
    return text.strip()


def build_prompt(
    question: str,
    findings: list[dict],
    coverage_gaps: list[str] = [],
) -> str:
    q = _sanitise(question)

    coverage_block = ""
    if coverage_gaps:
        gap_list = ", ".join(coverage_gaps)
        coverage_block = (
            f"<coverage_warning>\n"
            f"The following sub-questions failed to complete and are missing from the "
            f"research findings: {gap_list}. Acknowledge these gaps explicitly in your "
            f"coverage_gaps output field and reflect the reduced coverage in your "
            f"confidence scores.\n"
            f"</coverage_warning>\n"
        )

    finding_tags: list[str] = []
    for f in findings:
        sq_id = f.get("sq_id", "")
        confidence = f.get("final_confidence", "N/A")
        answer = f.get("answer", "")
        critique = f.get("critique_summary", "")
        finding_tags.append(
            f'  <finding id="{sq_id}" confidence="{confidence}">\n'
            f"  Answer: {answer}\n"
            f"  Critique: {critique}\n"
            f"  </finding>"
        )
    findings_block = "\n".join(finding_tags)

    prompt = (
        f"<s>\n"
        f"You are a senior strategic analyst. Synthesise the research findings below into "
        f"a decision brief. Elevate and integrate the findings into actionable intelligence "
        f"— do not merely repeat what the sub-questions said. Be direct, structured, and "
        f"honest about uncertainty and any coverage gaps. "
        f"Output ONLY valid JSON. No preamble. No markdown fences.\n"
        f"</s>\n"
        f"<original_question>\n"
        f"{q}\n"
        f"</original_question>\n"
        f"{coverage_block}"
        f"<research_findings>\n"
        f"{findings_block}\n"
        f"</research_findings>\n"
        f"\n"
        f"Output ONLY a valid JSON object matching this exact schema:\n"
        f"{{\n"
        f'  "key_findings": [\n'
        f'    {{ "finding": "...", "source_sq_ids": ["sq1"], "confidence": 1 }}\n'
        f"  ],\n"
        f'  "trade_offs": [\n'
        f'    {{ "option": "...", "pros": ["..."], "cons": ["..."] }}\n'
        f"  ],\n"
        f'  "recommendation": {{\n'
        f'    "primary": "...",\n'
        f'    "rationale": "...",\n'
        f'    "conditions": "..."\n'
        f"  }},\n"
        f'  "open_questions": ["..."],\n'
        f'  "confidence_overview": {{\n'
        f'    "overall": 1,\n'
        f'    "narrative": "..."\n'
        f"  }},\n"
        f'  "executive_summary": "...",\n'
        f'  "coverage_gaps": ["..."]\n'
        f"}}\n"
        f"\n"
        f"All confidence fields must be integers from 1 to 10. "
        f"coverage_gaps must list any research angles that were unavailable. "
        f"No other text."
    )
    return prompt.rstrip()
