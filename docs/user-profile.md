# User profile (in-memory)

User profile stores relevant health history (previous surgeries, prior injuries, etc.) so the agents can tailor and acknowledge it (e.g. "Given your history of knee surgery…").

## Backend

- **Schema:** `backend/schemas/profile.py` — `UserProfile`: medical_history, previous_surgeries, prior_injuries, chronic_conditions, other_relevant.
- **Store:** `backend/profile_store.py` — in-memory dict keyed by `session_id`; `get(session_id)`, `set_profile(session_id, profile)`, `build_profile_summary(profile)`.
- **API:**
  - `PUT /profile` — body: `session_id` + profile fields; saves to memory.
  - `GET /profile?session_id=...` — returns saved profile or `{ profile: null }`.
- **Assess:** `POST /assess` accepts `session_id` in the intake payload. When present, profile is loaded and passed to the pipeline; agents receive "Relevant user history: …" and are prompted to acknowledge it.

## Frontend

- **Component:** `frontend/src/components/UserProfileForm.jsx` — form for all profile fields; generates/stores `session_id` in `localStorage` (key `flexcare_session_id`); on submit calls `PUT /profile`.
- **Using profile with the recommendation:** The request that calls `POST /assess` must include `session_id` in the payload so the backend can load the profile. Example: pass `session_id: localStorage.getItem('flexcare_session_id')` into `buildIntakePayload(regionLevels, { ..., session_id })`. See `frontend/src/utils/intake.js`: `buildIntakePayload` accepts optional `session_id` in options.
- **App.jsx** is not modified; to have the main flow use the profile, add the profile form somewhere (e.g. a tab or section) and ensure the assess payload includes `session_id` from localStorage when the user has saved a profile.

## Agent behaviour

- **Assessment:** Includes user history in the prompt; system message asks to include it in the summary and consider it in risk level; acknowledge briefly when relevant.
- **Safety:** System message asks to consider user history (e.g. post-surgical pain) when evaluating red flags.
- **Recovery:** System message asks to acknowledge history and tailor recommendations (e.g. "Given your history of knee surgery…").
- **Referral:** System message asks to acknowledge history in reason or discipline_explanation when relevant.

## Later: authentication

Replace the in-memory store with a DB keyed by user id; require auth on `PUT/GET /profile` and pass user id (or session) into the pipeline instead of a raw profile string.
