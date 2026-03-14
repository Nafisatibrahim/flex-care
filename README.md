# FlexCare

**FlexCare** is an AI Musculoskeletal Recovery Assistant: tap where it hurts on a body map, get a heat visualization and a clear next step - safe stretches or referral - with a simple “why.”

- **Stack:** Railtracks (Gemini), Python backend, React (Vite) + Tailwind frontend.
- **Body map:** [react-muscle-highlighter](https://github.com/soroojshehryar/react-muscle-highlighter) (male/female, front & back).
- **API:** FastAPI `POST /assess`, `GET /health`.

**Deploy API on Railway:** Set `GEMINI_API_KEY`, start with `uvicorn backend.api:app --host 0.0.0.0 --port $PORT` (or use `Procfile`). Frontend: set `VITE_API_URL` to your Railway URL for production.