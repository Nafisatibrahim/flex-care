"""
Referral Agent: recommends next step (physio | chiro | massage | urgent | none)
based on assessment and safety decision. Uses Railtracks with ReferralOutput.
"""

import asyncio
from typing import Optional

import railtracks as rt

from backend.schemas.outputs import AssessmentOutput, ReferralOutput, SafetyOutput

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


REFERRAL_SYSTEM_PROMPT = """
You are the FlexCare Referral Agent. Given the assessment summary and the Safety decision, recommend the next step for the user.

Provider types (output exactly one):
- urgent: User must go to ER or urgent care now (Safety said urgent_care, or severe red flags).
- physio: Physiotherapy is the best next step (e.g. persistent pain, mobility issues, post-injury rehab).
- chiro: Chiropractic may be appropriate (e.g. spinal/neck focus, alignment; avoid if contraindicated).
- massage: Massage therapy may help (e.g. muscle tension, soft tissue; not for acute injury or red flags).
- none: User can continue with self-care; no referral needed (Safety said safe_to_continue and context supports it).

Rules:
- If Safety decision is urgent_care → provider_type must be "urgent"; set timing to "immediately" or "as soon as possible".
- If Safety decision is professional_soon → choose physio, chiro, or massage based on symptoms; set reason and timing (e.g. "within 1–2 weeks").
- If Safety decision is safe_to_continue → usually "none"; give a brief reason (e.g. "Self-care and recovery suggestions are appropriate.").

Always output:
- provider_type, reason (short explanation), and timing (when to see someone, or null if none).
- discipline_explanation: exactly 1–2 sentences explaining why this type of care (physio vs chiro vs massage vs urgent) is being recommended for this user. Use plain language so the user understands the rationale. If provider_type is "none", set discipline_explanation to null or a brief line like "Self-care is appropriate for now."

When the user's history is provided (e.g. previous surgery), acknowledge it in your reason or discipline_explanation when relevant (e.g. "Given your history of knee surgery…").
"""


def assessment_and_safety_to_prompt(
    assessment: AssessmentOutput,
    safety: SafetyOutput,
    free_text: Optional[str] = None,
) -> str:
    """Build the text prompt for the Referral Agent from assessment and safety."""
    parts = [
        f"Assessment: {assessment.symptom_summary}",
        f"Risk level: {assessment.risk_level}",
        f"Safety decision: {safety.decision}",
    ]
    if safety.triggered_red_flags:
        parts.append(f"Triggered red flags: {', '.join(safety.triggered_red_flags)}")
    if free_text:
        parts.append(f"User context: {free_text}")
    return "\n".join(parts)


referral_agent = rt.agent_node(
    name="Referral Agent",
    llm=rt.llm.GeminiLLM("gemini-2.5-flash"),
    system_message=REFERRAL_SYSTEM_PROMPT,
    output_schema=ReferralOutput,
)


async def run_referral(
    assessment: AssessmentOutput,
    safety: SafetyOutput,
    free_text: Optional[str] = None,
) -> ReferralOutput:
    """Run the Referral Agent; returns structured ReferralOutput."""
    prompt = assessment_and_safety_to_prompt(assessment, safety, free_text)
    result = await rt.call(referral_agent, prompt)
    return result.structured


async def main() -> None:
    """Example: run referral on sample assessment and safety."""
    sample_assessment = AssessmentOutput(
        symptom_summary="Lower back pain (4/10) and neck pain (2/10) for 3 days, triggered by sitting.",
        risk_level="low",
        missing_info=[],
    )
    sample_safety = SafetyOutput(decision="safe_to_continue", triggered_red_flags=[])
    out = await run_referral(sample_assessment, sample_safety)
    print("Provider type:", out.provider_type)
    print("Reason:", out.reason)
    print("Timing:", out.timing)


if __name__ == "__main__":
    asyncio.run(main())
