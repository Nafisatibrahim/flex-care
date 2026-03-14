"""
FlexCare API: FastAPI app for Railway and local use.
POST /assess: intake payload → pipeline result (assessment, safety, recovery or referral).
GET /health: readiness check.
"""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas.intake import IntakePayload
from backend.agents.pipeline import run_flexcare_pipeline

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


def main():
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
