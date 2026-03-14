"""
Recovery Agent: suggests safe stretches, posture tips, and habits when Safety
says safe_to_continue. Uses Railtracks with structured output (RecoveryOutput).
"""

import asyncio
from typing import Optional

import railtracks as rt

from backend.schemas.outputs import AssessmentOutput, RecoveryOutput

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


RECOVERY_SYSTEM_PROMPT = """
You are the FlexCare Recovery Agent. The user has been assessed and cleared for self-care (no red flags). Your job is to suggest a short, practical recovery plan.

Based on the symptom summary and pain areas (e.g. lower back, neck, shoulders), recommend:
- 2–4 concrete actions: gentle stretches, posture adjustments, work-break reminders, or mobility tips. Be specific and safe (no aggressive or high-load exercises).
- Precautions: what to avoid or be careful about (e.g. avoid prolonged sitting without breaks, avoid heavy lifting).
- Optionally set source to a short phrase like "FlexCare recovery guide" if you want.

Keep actions and precautions brief and actionable. Do not suggest anything that could worsen injury or replace professional care.

When the user has provided relevant medical history (e.g. previous surgery, prior injuries), acknowledge it in your response and tailor your recommendations (e.g. \"Given your history of knee surgery…\" or \"Because you've had back surgery, avoid…\").
"""


def assessment_to_recovery_prompt(
    assessment: AssessmentOutput,
    free_text: Optional[str] = None,
) -> str:
    """Build the text prompt for the Recovery Agent from assessment."""
    parts = [
        f"Symptom summary: {assessment.symptom_summary}",
        f"Risk level: {assessment.risk_level}",
    ]
    if free_text:
        parts.append(f"User context: {free_text}")
    return "\n".join(parts)


recovery_agent = rt.agent_node(
    name="Recovery Agent",
    llm=rt.llm.GeminiLLM("gemini-2.5-flash"),
    system_message=RECOVERY_SYSTEM_PROMPT,
    output_schema=RecoveryOutput,
)


async def run_recovery(
    assessment: AssessmentOutput,
    free_text: Optional[str] = None,
) -> RecoveryOutput:
    """Run the Recovery Agent on an assessment; returns structured RecoveryOutput."""
    prompt = assessment_to_recovery_prompt(assessment, free_text)
    result = await rt.call(recovery_agent, prompt)
    return result.structured


async def main() -> None:
    """Example: run recovery on a sample assessment."""
    sample = AssessmentOutput(
        symptom_summary="Lower back pain (4/10) and neck pain (2/10) for 3 days, triggered by sitting.",
        risk_level="low",
        missing_info=[],
    )
    out = await run_recovery(sample)
    print("Actions:", out.actions)
    print("Precautions:", out.precautions)
    print("Source:", out.source)


if __name__ == "__main__":
    asyncio.run(main())
