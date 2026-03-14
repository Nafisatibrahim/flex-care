"""
Assessment Agent: turns intake (body map + optional text) into a structured
symptom summary, risk level, and list of missing info.
"""

import asyncio
import railtracks as rt

from backend.schemas.intake import IntakePayload
from backend.schemas.outputs import AssessmentOutput

# Load env for API keys (e.g. GEMINI_API_KEY)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def intake_to_prompt(payload: IntakePayload) -> str:
    """Turn intake payload into a short text prompt for the Assessment Agent."""
    parts = []
    for r in payload.regions:
        parts.append(f"{r.region_id} pain level {r.level}/10")
    text = "Pain reported: " + "; ".join(parts) + "."
    if payload.free_text:
        text += f" User says: {payload.free_text}"
    if payload.duration:
        text += f" Duration: {payload.duration}."
    if payload.triggers:
        text += f" Triggers: {payload.triggers}."
    return text


# Assessment Agent: structured output (symptom_summary, risk_level, missing_info)
assessment_agent = rt.agent_node(
    name="Assessment Agent",
    llm=rt.llm.GeminiLLM("gemini-2.5-flash"),
    system_message=(
        "You are a musculoskeletal assessment assistant for FlexCare. "
        "Given pain regions and levels (1-10) and any user description, produce a brief symptom summary, "
        "a risk level (low, medium, or high), and a list of missing information you would need for a fuller assessment "
        "(e.g. duration, triggers, warning signs). Be concise and consistent with the data given."
    ),
    output_schema=AssessmentOutput,
)


async def run_assessment(payload: IntakePayload) -> AssessmentOutput:
    """Run the Assessment Agent on an intake payload; returns structured AssessmentOutput."""
    prompt = intake_to_prompt(payload)
    result = await rt.call(assessment_agent, prompt)
    return result.structured


async def main() -> None:
    """Example: run assessment on a sample intake."""
    sample = IntakePayload(
        regions=[
            {"region_id": "lower_back", "level": 4},
            {"region_id": "neck", "level": 2},
        ],
        free_text="Hurt after sitting all day.",
        duration="3 days",
        triggers="sitting",
    )
    out = await run_assessment(sample)
    print("Symptom summary:", out.symptom_summary)
    print("Risk level:", out.risk_level)
    print("Missing info:", out.missing_info)


if __name__ == "__main__":
    asyncio.run(main())
