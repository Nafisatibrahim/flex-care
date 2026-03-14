"""
Safety Agent: checks assessment (and user context) for red flags and returns
a decision: safe_to_continue | professional_soon | urgent_care.
Uses Railtracks with structured output (SafetyOutput).
"""

import asyncio
from typing import Optional

import railtracks as rt

from backend.schemas.outputs import AssessmentOutput, SafetyOutput

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


RED_FLAGS_PROMPT = """
You are the FlexCare Safety Agent. Your job is to decide whether the user can safely continue with self-care or must see a professional.

Red flags (if present in the assessment or user text, output them in triggered_red_flags and choose the appropriate decision):
- numbness or tingling → professional_soon or urgent_care (urgent if severe/sudden)
- loss of bladder or bowel control → urgent_care
- chest pain → urgent_care
- sudden severe weakness → urgent_care
- inability to stand or walk → urgent_care
- recent trauma (e.g. fall, accident) → professional_soon or urgent_care depending on severity
- radiating pain (e.g. down the leg) → professional_soon
- fever with back/neck pain → professional_soon or urgent_care
- unexplained weight loss with pain → professional_soon

Decisions:
- urgent_care: any of the above that require immediate care (bowel/bladder, chest pain, severe weakness, inability to stand/walk, etc.).
- professional_soon: red flags that need professional assessment but not necessarily ER (numbness/tingling, trauma, radiating pain, etc.).
- safe_to_continue: no red flags; user can proceed with guided recovery.

Output your decision and list exactly which red flags (from the list above) were detected, if any. If none, triggered_red_flags must be empty.
"""


def assessment_to_safety_prompt(assessment: AssessmentOutput, free_text: Optional[str] = None) -> str:
    """Build the text prompt for the Safety Agent from assessment output."""
    parts = [
        f"Assessment summary: {assessment.symptom_summary}",
        f"Risk level from assessment: {assessment.risk_level}",
    ]
    if free_text:
        parts.append(f"User also said: {free_text}")
    return "\n".join(parts)


safety_agent = rt.agent_node(
    name="Safety Agent",
    llm=rt.llm.GeminiLLM("gemini-2.5-flash"),
    system_message=RED_FLAGS_PROMPT,
    output_schema=SafetyOutput,
)


async def run_safety(
    assessment: AssessmentOutput,
    free_text: Optional[str] = None,
) -> SafetyOutput:
    """Run the Safety Agent on an assessment; returns structured SafetyOutput."""
    prompt = assessment_to_safety_prompt(assessment, free_text)
    result = await rt.call(safety_agent, prompt)
    return result.structured


async def main() -> None:
    """Example: run safety on a sample assessment."""
    sample_assessment = AssessmentOutput(
        symptom_summary="Lower back pain (4/10) and neck pain (2/10) for 3 days, triggered by sitting.",
        risk_level="low",
        missing_info=[],
    )
    out = await run_safety(sample_assessment)
    print("Decision:", out.decision)
    print("Triggered red flags:", out.triggered_red_flags)


if __name__ == "__main__":
    asyncio.run(main())
