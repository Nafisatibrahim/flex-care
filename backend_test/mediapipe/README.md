# FlexCare – MediaPipe squat demo (frontend-only)

This is a **small web demo** for Phase 5 / Pose exploration:

- Webcam → **MediaPipe Pose** (Tasks-Vision, `pose_landmarker_lite`)
- Extract **joint angles** (knees, hips, torso lean)
- Apply simple **squat heuristics** (depth, knee cave, back rounding)
- Overlay a **skeleton + angles + feedback** on the video

> This folder is frontend-only (no build step). It’s meant for quick iteration and demoing posture logic before wiring into the main React app and Gemini.

---

## Files

- `index.html` – basic page with:
  - `<video id="webcam">` – webcam stream
  - `<canvas id="overlay">` – skeleton + colors
  - status panel (rep state + feedback)
  - angles panel (knee L/R, hip L/R, torso lean)
- `style.css` – dark, compact layout.
- `main.js` – core logic:
  - Loads `@mediapipe/tasks-vision` via CDN (`PoseLandmarker` + `FilesetResolver`)
  - Uses **VIDEO** mode + `detectForVideo` in a loop (LIVE_STREAM is not supported in JS; VIDEO is used for webcam)
  - Computes:
    - Knee angles: hip–knee–ankle (L/R)
    - Hip angles: shoulder–hip–knee (L/R)
    - Torso lean: angle between hips–shoulders vector and vertical
  - Simple squat **state machine**:
    - `STANDING` → `DESCENDING` → `BOTTOM` → `ASCENDING` → back to `STANDING`
  - Heuristics:
    - **Depth** – if average knee angle never goes below threshold (e.g. 95°), rep is “too shallow”.
    - **Knee cave** – if distance between knees is much smaller than distance between hips.
    - **Back rounding** – if torso lean exceeds a threshold (e.g. 25° away from vertical).
  - Visual + audio feedback:
    - Colors segments:
      - Green when form looks good.
      - Red for legs/torso when depth, knee cave, or back issues are detected.
    - Shows angle values and current rep state.
    - Optional spoken cues via `speechSynthesis` when feedback updates.

---

## How to run locally

Because browsers block camera access on plain `file://` URLs, you need to serve this folder over HTTP.

From the **repo root**:

```bash
cd backend_test/mediapipe

# Option 1: Node serve (if you have Node)
npx serve .

# Option 2: Python (3.x)
python -m http.server 4173
```

Then open:

- `http://localhost:3000` (or whatever port `serve` prints), **or**
- `http://localhost:4173` for the Python server.

Grant camera permission when the browser prompts you.

---

## Using the demo

1. Stand a short distance from your webcam, full body in frame if possible.
2. You should see:
   - The webcam feed with a **skeleton overlay**.
   - Live **angles** and **rep state**.
3. Perform a **slow bodyweight squat**:
   - Watch the knee and hip angles change.
   - See visual + text feedback:
     - “Go deeper” if you don’t reach the depth threshold.
     - “Knees out” if your knees collapse inward.
     - “Keep your chest up” if you lean/round too much.
4. When a rep completes (back to standing), the panel summarises that rep (good / shallow / adjust form).

---

## Next steps / integration hooks

This demo stays self-contained on the frontend. To integrate with Gemini later:

- Extract a small **angles payload** (e.g. `{ exercise_id: "squat", knee_left, knee_right, hip_left, hip_right, torso_lean }`).
- POST it to the posture feedback API in `backend_test/posture_feedback` (or an equivalent endpoint).
- Use Gemini to turn angles + exercise name into:
  - What’s happening
  - Why it’s wrong
  - Why it feels wrong
  - How to fix it
  - Safety tips

For now, this folder gives you a **live, visual playground** to tune pose+angle logic and heuristics quickly.

