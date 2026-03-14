"""
FlexCare API: FastAPI app for Railway and local use.
POST /assess: intake payload → pipeline result (assessment, safety, recovery or referral).
GET /health: readiness check.
GET /referral/providers: list providers by type (optional lat/lon for ranking).
GET /referral/coverage: coverage copy + checklist for a discipline.
GET /referral/insurers: list insurers (for coverage comparison).
GET /referral/plans: list plans, optional insurer_slug filter.
POST /referral/explain: why / why not explanation given plan and optional provider.
"""

import os
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.schemas.intake import IntakePayload
from backend.agents.pipeline import run_flexcare_pipeline
from backend.agents.explain_referral import run_explain
from backend.referral_providers import (
    get_providers,
    get_coverage_for_discipline,
    ReferralProviderType,
)
from backend.referral_coverage import get_insurers, get_plans

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = FastAPI(
    title="FlexCare API",
    description="AI Musculoskeletal Recovery Assistant — assess intake and return recommendation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Readiness check for Railway and load balancers."""
    return {"status": "ok"}


@app.post("/assess")
async def assess(payload: IntakePayload):
    """
    Run the FlexCare pipeline on the intake payload.
    Returns assessment, safety decision, and either recovery actions or referral.
    """
    try:
        result = await run_flexcare_pipeline(payload)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Pipeline failed")


@app.get("/referral/providers")
def referral_providers(
    provider_type: ReferralProviderType,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
):
    """
    Return providers for the given referral type, ranked by distance (if lat/lon provided),
    then direct bill, then languages. First result is marked recommended.
    """
    providers = get_providers(provider_type, lat=lat, lon=lon)
    return {"providers": [p.model_dump() for p in providers]}


@app.get("/referral/coverage")
def referral_coverage(provider_type: ReferralProviderType):
    """Return general coverage copy and checklist for the discipline (no plan-specific data)."""
    return get_coverage_for_discipline(provider_type)


@app.get("/referral/insurers")
def referral_insurers():
    """List insurers (e.g. Sun Life, Manulife) for coverage comparison."""
    return {"insurers": get_insurers()}


@app.get("/referral/plans")
def referral_plans(insurer_slug: Optional[str] = None):
    """List plans. If insurer_slug is provided, filter to that insurer's plans."""
    return {"plans": get_plans(insurer_slug=insurer_slug)}


class ExplainRequest(BaseModel):
    provider_type: ReferralProviderType
    plan_slug: str = Field(description="e.g. sunlife_basic")
    question: Literal["why", "why_not"] = Field(description="Why this fit? or Why might it not?")
    provider_id: Optional[str] = Field(default=None, description="Optional; if set, explain for this specific provider.")


@app.post("/referral/explain")
async def referral_explain(body: ExplainRequest):
    """Return a short AI explanation: why this care/provider fits the user's plan, or why not."""
    try:
        explanation = await run_explain(
            provider_type=body.provider_type,
            plan_slug=body.plan_slug,
            question=body.question,
            provider_id=body.provider_id,
        )
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not generate explanation. Please try again.")


def main():
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
