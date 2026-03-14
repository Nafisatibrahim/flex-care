"""
Explain Referral Agent: given plan benefits and optional provider, returns a short
"Why?" or "Why not?" explanation for the user (good fit vs caveats).
"""

from typing import Literal, Optional

import railtracks as rt

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def _format_benefits(benefits: dict) -> str:
    if not benefits:
        return "No specific benefits listed."
    parts = []
    if benefits.get("annual_limit_dollars"):
        parts.append(f"${benefits['annual_limit_dollars']}/year")
    if benefits.get("session_limit"):
        parts.append(f"{benefits['session_limit']} sessions")
    if benefits.get("per_session_cap_dollars"):
        parts.append(f"up to ${benefits['per_session_cap_dollars']}/session")
    if benefits.get("direct_bill_common"):
        parts.append("direct billing common")
    else:
        parts.append("often pay then submit receipt")
    if benefits.get("notes"):
        parts.append(f"Note: {benefits['notes']}")
    return "; ".join(parts)


def build_explain_prompt(
    provider_type: str,
    plan_name: str,
    insurer_name: str,
    benefits_text: str,
    provider: Optional[dict] = None,
    question: Literal["why", "why_not"] = "why",
) -> str:
    """Build prompt for the explain agent."""
    discipline = {"physio": "physiotherapy", "chiro": "chiropractic", "massage": "massage therapy", "urgent": "urgent/emergency care"}.get(provider_type, provider_type)
    parts = [
        f"The user's plan is {insurer_name} — {plan_name}.",
        f"For {discipline}, their plan typically includes: {benefits_text}.",
    ]
    if provider:
        parts.append(
            f"Provider: {provider.get('name')} at {provider.get('clinic')}. "
            f"Direct bill: {provider.get('accepts_direct_bill')}. "
            f"Languages: {', '.join(provider.get('languages') or [])}."
        )
    else:
        parts.append("No specific provider selected; explain in terms of this type of care and the plan.")
    if question == "why":
        parts.append("In 2–3 short sentences, explain why this type of care (and this provider if given) is a good fit for their coverage and situation.")
    else:
        parts.append("In 2–3 short sentences, explain why this type of care or provider might not be ideal—e.g. limits, direct billing, referral, or other caveats. Be helpful, not alarming.")
    return "\n".join(parts)


EXPLAIN_SYSTEM = """You are the FlexCare coverage assistant. You help users understand whether their insurance plan fits the recommended care (e.g. physio, chiro, massage). You receive the user's plan benefits and optionally a specific provider. Answer in plain language, 2–3 sentences. Do not promise exact coverage—final coverage is determined by the insurer. Be concise and practical."""


from backend.schemas.outputs import ExplainOutput

explain_agent = rt.agent_node(
    name="Explain Referral",
    llm=rt.llm.GeminiLLM("gemini-2.5-flash"),
    system_message=EXPLAIN_SYSTEM,
    output_schema=ExplainOutput,
)


async def run_explain(
    provider_type: str,
    plan_slug: str,
    question: Literal["why", "why_not"],
    provider_id: Optional[str] = None,
) -> str:
    """
    Return a short explanation (why this fits or why not).
    Uses referral_coverage for plan benefits and referral_providers for provider by id.
    """
    from backend.referral_coverage import get_plan_benefits
    from backend.referral_providers import get_provider_by_id

    plan = get_plan_benefits(plan_slug)
    if not plan:
        return "We couldn't find that plan. Please check your selection and try again."
    insurer_slug = plan.get("insurer_slug", "")
    insurer_name = insurer_slug.replace("_", " ").title()
    benefits = (plan.get("benefits") or {}).get(provider_type)
    benefits_text = _format_benefits(benefits) if benefits else "Check your plan booklet for this service."

    provider = None
    if provider_id:
        provider = get_provider_by_id(provider_id)

    prompt = build_explain_prompt(
        provider_type=provider_type,
        plan_name=plan.get("name", plan_slug),
        insurer_name=insurer_name,
        benefits_text=benefits_text,
        provider=provider,
        question=question,
    )
    result = await rt.call(explain_agent, prompt)
    out = result.structured
    return out.explanation if hasattr(out, "explanation") and out.explanation else str(out)
