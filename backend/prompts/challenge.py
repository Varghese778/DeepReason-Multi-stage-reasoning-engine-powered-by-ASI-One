from __future__ import annotations

import re

_OPEN_QUESTIONS_SCHEMA = (
    "{{\n"
    '  "open_questions": ["..."],\n'
    '  "challenge_response": "..."\n'
    "}}"
)

_GENERIC_SCHEMA = (
    "Output ONLY valid JSON that exactly matches the schema of the "
    "<current_content> above, with all fields updated to reflect your revised "
    "reasoning. Add a top-level \"challenge_response\" string field explaining "
    "whether and why you updated your reasoning, or why the challenge does not "
    "change your conclusion."
)


def _sanitise(text: str, max_len: int = 1000) -> str:
    text = text[:max_len]
    text = re.sub(r'[<>&{}"\']', "", text)
    return text.strip()


def build_prompt(
    question: str,
    section_name: str,
    current_section_json: str,
    challenge_text: str,
    supporting_research: str,
) -> str:
    q = _sanitise(question)
    ct = _sanitise(challenge_text, max_len=500)

    if section_name == "open_questions":
        schema_instruction = (
            f"Because the challenged section is open_questions, output ONLY a valid "
            f"JSON object matching this exact schema:\n"
            f"{_OPEN_QUESTIONS_SCHEMA}\n"
            f"\n"
            f"challenge_response must explain whether and why you updated the list, "
            f"or why the challenge does not change it. No other text."
        )
    else:
        schema_instruction = (
            f"{_GENERIC_SCHEMA}\n"
            f"\n"
            f"Output ONLY the JSON object. No preamble. No markdown fences. No other text."
        )

    if section_name == "open_questions":
        open_q_instruction = (
            " The open_questions field contains unresolved analytical questions about "
            "the topic for further research. Do NOT ask the user for personal information. "
            "Return revised analytical questions about the subject matter only."
        )
    else:
        open_q_instruction = ""

    prompt = (
        f"<s>\n"
        f"You are re-evaluating a specific section of a decision brief in light of a "
        f"new challenge from the user. Take the challenge seriously. Do not be defensive. "
        f"Update your reasoning if the challenge is valid. If the challenge is invalid, "
        f"explain clearly why.{open_q_instruction} "
        f"Output ONLY valid JSON. No preamble. No markdown fences.\n"
        f"</s>\n"
        f"<original_question>\n"
        f"{q}\n"
        f"</original_question>\n"
        f"<section_being_challenged>\n"
        f"{section_name}\n"
        f"</section_being_challenged>\n"
        f"<current_content>\n"
        f"{current_section_json}\n"
        f"</current_content>\n"
        f"<user_challenge>\n"
        f"{ct}\n"
        f"</user_challenge>\n"
        f"<supporting_research>\n"
        f"{supporting_research}\n"
        f"</supporting_research>\n"
        f"\n"
        f"{schema_instruction}"
    )
    return prompt.rstrip()
