# FlexCare

**Tap where it hurts. Get a clear next step—with a simple *why*.**

[![Demo Video](https://img.shields.io/badge/Watch-Demo%20Video-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=e_RdboLkEEc)  
[![Live App](https://img.shields.io/badge/Try%20it-Live%20App-00C853?style=for-the-badge)](https://flex-care.replit.app)  
[![GitHub](https://img.shields.io/badge/Code-GitHub-24292e?style=for-the-badge&logo=github)](https://github.com/Nafisatibrahim/flex-care)

<!-- Optional: add your logo to assets/ and uncomment -->
<!-- ![FlexCare Logo](assets/logo.png) -->

FlexCare is an **AI-powered musculoskeletal recovery assistant** built for [GenAI Genesis 2026](https://genai-genesis-2026.devpost.com/). It helps people understand muscle and joint pain, track symptoms, get safe recovery guidance or a referral—and see *why* the AI suggested it. No more guessing between "rest or stretch?" or "do I need a specialist?".

---

## What it does

- **Body map intake** — Tap front/back body views (male or female), rate pain 1–10, add duration and triggers.
- **AI pipeline** — Assessment → Safety check → Recovery *or* Referral, with a short **"Why this recommendation"** so the logic is transparent.
- **Recovery path** — Numbered steps, guided exercises (e.g. squat, cat–cow, chin tucks), precautions, and optional "Record & get feedback" for form tips.
- **Referral path** — Provider list, insurer/plan selection, **"Plan covers X%; you pay the rest"**, and per-provider **"Why this provider?"** / **"Why not?"**.
- **Symptom history** — Structured timeline so users (and their doctor) have a clear picture.

**Goal:** Help people move from pain to the right care—at the right time.

---

## Architecture

FlexCare is a **multi-agent pipeline** (Assessment → Safety → Recovery or Referral) powered by **Gemini**, with a React frontend and FastAPI backend.

```
┌─────────────┐     ┌──────────────────────────────────────────────────────────┐
│   User      │     │                     BACKEND (FastAPI)                        │
│   Body map  │────▶│  Intake → Assessment Agent → Safety Agent                  │
│   + form    │     │       → Recovery Agent (steps, exercises)                  │
│             │     │         OR Referral Agent (type, timing)                    │
│             │     │  → "Why this recommendation?" + cost estimate + explain     │
└─────────────┘     └──────────────────────────────────────────────────────────┘
        │                                    │
        │                                    ▼
        │            ┌──────────────────────────────────────────────────────────┐
        └───────────▶│  FRONTEND (React + Vite + Tailwind)                      │
                     │  Body map (react-muscle-highlighter) • Results • Referral │
                     │  Profile • Exercises • Coverage % + "Why this provider?"   │
                     └──────────────────────────────────────────────────────────┘
```

<!-- Optional: add assets/architecture.png and uncomment -->
<!-- ![Architecture](assets/architecture.png) -->

**Repo layout:**

| Folder / file   | What it is |
|-----------------|------------|
| `frontendedit/` | **Active frontend** (landing, assessment, results, referral). This is what the live app runs. |
| `frontend/`     | Simpler reference frontend. |
| `backend/`      | FastAPI app, agents (assessment, safety, recovery, referral, explain), profile store, exercises, referral data. |
| `backend_test/` | Posture feedback and MediaPipe demos (separate from main API). |
| `assets/`       | Logos, thumbnails, screenshots. |

---

## Tech stack

| Layer      | Tech |
|-----------|------|
| **Frontend** | React, Vite, Tailwind CSS, react-muscle-highlighter |
| **Backend**  | Python, FastAPI, Pydantic |
| **AI**       | Google Gemini API, Railtracks (agent orchestration) |
| **Data**     | JSON/CSV (insurer plans, providers), in-memory profile store |
| **Hosting**  | Replit (app), Railway (API) |

---

## Quick start

### Backend

```bash
# From repo root
pip install -r requirements.txt
export GEMINI_API_KEY="your-key"
uvicorn backend.api:app --host 0.0.0.0 --port 8000
```

### Frontend (active app)

```bash
cd frontendedit
npm install
npm run dev
```

Set `VITE_API_URL` to your backend (e.g. `http://localhost:8000` or your Railway URL).

### Production

- **API:** e.g. Railway — `uvicorn backend.api:app --host 0.0.0.0 --port $PORT`
- **Frontend:** Set `VITE_API_URL` to the API URL, then build and deploy (e.g. Replit, Vercel).

**Production API:** `https://genai-genesis-2026-production.up.railway.app` — for production frontend build set `VITE_API_URL=https://genai-genesis-2026-production.up.railway.app` (no trailing slash).

---

## Links

| Link | URL |
|------|-----|
| **Demo video** | [Watch on YouTube](https://www.youtube.com/watch?v=e_RdboLkEEc) |
| **Live app**   | [https://flex-care.replit.app](https://flex-care.replit.app) |
| **Repository** | [github.com/Nafisatibrahim/flex-care](https://github.com/Nafisatibrahim/flex-care) |

---

## Built by

| | |
|---|---|
| **Nafisat Ibrahim** (she/her) | [nafisatibrahim.com](https://nafisatibrahim.com) · [GitHub](https://github.com/Nafisatibrahim) · [LinkedIn](https://linkedin.com/in/nafisatibrahim) |
| **Haniyeh Jalayeri** (she/her) | [GitHub](https://github.com/HaniJal) · [LinkedIn](https://linkedin.com/in/haniyeh-jalayeri) |

Built for **GenAI Genesis 2026** — Sun Life Best Health Care Hack Using Agentic AI.

---

## License

MIT. See [LICENSE](LICENSE).
