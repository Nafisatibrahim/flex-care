# Insurance Intelligence – Implementation Plan

**Rule: Do not modify `frontend/src/App.jsx`.** All other frontend files may be updated as needed.

**Implementation status:** All steps below have been implemented (see backend data, referral_coverage, referral_providers, api, agents/explain_referral, services).

---

## Step 1: Extend insurer/plan data (coverage % and referral)

**Goal:** Plans include reimbursement rate and whether a referral is required per service.

**Tasks:**
- [ ] In `backend/data/insurer_plans.json`, for each plan’s `benefits` entry (physio, chiro, massage):
  - Add **`coverage_percent`** (e.g. 80, 90). Use for “insurance pays X%”.
  - Add **`referral_required`** (boolean, optional) where relevant (e.g. Manulife Standard = true).
- [ ] In `backend/referral_coverage.py` (or wherever plan benefits are read), ensure **`get_plan_benefits()`** (or equivalent) returns these new fields so the explain agent and cost estimator can use them.
- [ ] No changes to `frontend/src/App.jsx`.

**Checklist:**
- [ ] Every plan in `insurer_plans.json` has `coverage_percent` (and optional `referral_required`) for physio, chiro, massage.
- [ ] Backend still loads plans without errors; explain/coverage logic can read the new fields.

---

## Step 2: Extend provider data (cost per visit, insurers accepted)

**Goal:** Each provider has a cost per visit and optionally which insurers they accept.

**Tasks:**
- [ ] In `backend/data/referral_providers.csv`, add two columns:
  - **`cost_per_visit`** (number, e.g. 120, 95). Synthetic demo values.
  - **`insurers_accepted`** (optional): comma-separated insurer slugs, e.g. `SunLife,Manulife` (or leave empty to mean “check with clinic”).
- [ ] In `backend/referral_providers.py`:
  - Update **`_load_providers_csv()`** to parse `cost_per_visit` (float) and `insurers_accepted` (list of strings from splitting on comma).
  - Update the **`Provider`** Pydantic model to include **`cost_per_visit: Optional[float] = None`** and **`insurers_accepted: list[str] = Field(default_factory=list)`**.
  - Update **`_FALLBACK_PROVIDERS`** so each fallback dict includes `cost_per_visit` and `insurers_accepted`.
- [ ] No changes to `frontend/src/App.jsx`.

**Checklist:**
- [ ] CSV has a header row and one column for `cost_per_visit`, one for `insurers_accepted`.
- [ ] All existing provider rows have a numeric `cost_per_visit` (and optional `insurers_accepted`).
- [ ] `get_providers()` and `get_provider_by_id()` return providers with the new fields; API response includes them.

---

## Step 3: Cost estimator (backend)

**Goal:** Given plan + provider (or provider type), compute: cost per visit, amount covered, amount user pays; optionally mention annual limit.

**Tasks:**
- [ ] Add a new module or section (e.g. in **`backend/referral_providers.py`** or **`backend/referral_coverage.py`**) with a function **`estimate_cost(plan_slug: str, provider_type: str, provider_id: Optional[str] = None) -> dict`**.
  - Look up plan benefits for `provider_type`; get `coverage_percent`, `per_session_cap_dollars`, `annual_limit_dollars`.
  - If `provider_id` given, get provider and use `cost_per_visit`; else use a default cost for that type.
  - **Logic:** `covered = min(cost * (coverage_percent / 100), per_session_cap_dollars)`; `you_pay = cost - covered`.
  - Return e.g. `{ "cost_per_visit": float, "covered_amount": float, "you_pay": float, "annual_limit_dollars": int | None, "coverage_percent": int | None }`.
- [ ] No changes to `frontend/src/App.jsx`.

**Checklist:**
- [ ] `estimate_cost(plan_slug, provider_type, provider_id=None)` returns the structure above.
- [ ] When plan has no benefit for that service, function doesn’t crash; returns safe defaults or nulls.
- [ ] Urgent care handled (e.g. no cost estimate or a note).

---

## Step 4: Expose cost estimate via API

**Goal:** Frontend can get a cost estimate for the current plan + referral type (and optional provider).

**Tasks:**
- [ ] Add **`GET /referral/cost-estimate?plan_slug=...&provider_type=...&provider_id=...`** (or POST with body) that calls **`estimate_cost()`** and returns the same structure.
- [ ] No changes to `frontend/src/App.jsx`.

**Checklist:**
- [ ] Endpoint returns the cost-estimate object.
- [ ] No PII in response.

---

## Step 5: Wire cost + coverage into Explain Agent

**Goal:** “Why?” / “Why not?” explanations include one or two sentences about cost: “Visit is $X; your plan covers Y%; you pay about $Z. Annual limit $W.”

**Tasks:**
- [ ] In **`backend/agents/explain_referral.py`**: before calling the LLM, call **`estimate_cost(plan_slug, provider_type, provider_id)`**. If a valid estimate is returned, add to the prompt a short “Cost summary: visit $X, plan covers Y%, you pay $Z; annual limit $W.” Ask the model to include this in the explanation when available.
- [ ] No changes to `frontend/src/App.jsx`.

**Checklist:**
- [ ] For a given plan + provider type (and optional provider), the explain response includes “you pay about $X” and annual limit when data exists.
- [ ] When cost data is missing, the explain agent doesn’t break; it omits cost or says “check with your plan/clinic.”

---

## Step 6: Optional – referral_required and insurers_accepted in explanations

**Goal:** “Why not?” can mention “Your plan may require a doctor’s referral” and “This clinic direct-bills Sun Life” (or “not all insurers accepted”).

**Tasks:**
- [ ] In the explain prompt builder, include: **`referral_required`** from plan benefits; **`insurers_accepted`** from provider. Ask the model to mention referral requirement or insurer match in “Why?” / “Why not?” when relevant.
- [ ] No changes to `frontend/src/App.jsx`.

**Checklist:**
- [ ] When `referral_required` is true, the explanation sometimes mentions referral.
- [ ] When `insurers_accepted` is set, the explanation can mention whether the user’s insurer is in the list.

---

## Step 7: Optional – services.csv (symptom → service)

**Goal:** Explicit mapping for “lower back pain → Physiotherapy” etc.

**Tasks:**
- [ ] Create **`backend/data/services.csv`** with columns **`symptom`**, **`recommended_service`**.
- [ ] Add a loader that returns a list of `{ symptom, recommended_service }`.
- [ ] (Optional) In the Referral Agent, add this mapping as context. Do **not** change the pipeline entry point or `frontend/src/App.jsx`.

**Checklist:**
- [ ] `services.csv` exists and is loaded; at least 3–5 rows for demo.
- [ ] If integrated into Referral Agent, the agent still returns the same schema.

---

## Summary checklist (for the agent)

- [ ] **Step 1:** `insurer_plans.json` has `coverage_percent` (and optional `referral_required`) per service; backend reads them.
- [ ] **Step 2:** `referral_providers.csv` has `cost_per_visit` and optional `insurers_accepted`; Provider model and CSV loader updated; fallback data updated.
- [ ] **Step 3:** `estimate_cost(plan_slug, provider_type, provider_id?)` implemented.
- [ ] **Step 4:** GET (or POST) `/referral/cost-estimate` implemented.
- [ ] **Step 5:** Explain agent receives cost estimate and includes “you pay $X” and annual limit in the explanation when available.
- [ ] **Step 6 (optional):** Explain prompt includes `referral_required` and `insurers_accepted`.
- [ ] **Step 7 (optional):** `services.csv` added and loaded; optionally used in Referral Agent context.
- [ ] **Global:** No edits to **`frontend/src/App.jsx`**.
