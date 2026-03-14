# Posture feedback: ideas and steps

**Goal:** Video/webcam → MediaPipe Pose → joint angles → Gemini explains posture (what’s happening, why it’s wrong, why it feels wrong, how to fix). Great visual representation in the app.

---

## Desired flow

```
Video / webcam (React camera feed)
    ↓
Pose detection (MediaPipe)
    ↓
Extract joint angles (knee, hip, spine, etc.)
    ↓
Send angles to Gemini
    ↓
Gemini explains posture
```

**Demo:** User performs squat → skeleton detection → angles calculated → Gemini gives feedback.

**Stack:** MediaPipe Pose + Gemini API + React camera feed.

---

## Ideas

- **Angles, not raw keypoints:** Compute joint angles from MediaPipe keypoints (e.g. knee flexion, hip angle, torso lean) and send those to Gemini so it can explain posture in terms users and clinicians understand.
- **Gemini explains posture:** Prompt should ask for:
  - **What’s happening** — plain-language description of the current posture.
  - **Why it’s wrong** — brief biomechanics / form explanation.
  - **Why it feels wrong** — where strain or discomfort likely comes from.
  - **How to fix it** — clear cues and, if useful, target angles or positions.
- **Visual representation:** Show skeleton overlay on the camera feed, angle labels (e.g. knee 85°), and Gemini’s explanation (what’s wrong / why it feels wrong / how to fix) in the UI so the user sees what’s happening and why.
- **React camera feed:** Run MediaPipe Pose in the browser on the live camera stream; draw skeleton on a canvas overlay; compute angles in the frontend (or send keypoints to backend and get angles + explanation back). Keep video local for privacy when possible.

---

## Steps (to do)

1. **Joint angles from pose**
   - From MediaPipe keypoints, compute angles (e.g. knee = angle between thigh and shank segments; hip; spine/torso).
   - Define a small set of angles per exercise (e.g. for squat: left/right knee, left/right hip, torso lean).
   - Expose angles in a consistent format (e.g. `{ knee_left: 85, knee_right: 90, hip_angle: 75, torso_lean: 15 }`).

2. **Backend: angles → Gemini**
   - Accept **angles** (and exercise_id / name) in the API instead of or in addition to raw keypoints.
   - Update Gemini prompt to take angles and return structured explanation: what’s happening, why it’s wrong, why it feels wrong, how to fix it (and optionally safety tips).

3. **Frontend: React camera + MediaPipe**
   - Use existing camera component (e.g. ExerciseCapture) as live feed.
   - Integrate MediaPipe Pose in the browser (e.g. `@mediapipe/pose` or equivalent); run on video frames.
   - Draw skeleton overlay on canvas (or overlay component) so the user sees detected pose.

4. **Frontend: compute angles (or get from backend)**
   - Either compute angles in the frontend from keypoints each frame / on “submit”, or send keypoints to backend and receive angles + Gemini response.
   - Display angle values on the overlay (e.g. “Knee L: 85°”) for transparency.

5. **Frontend: call API and show Gemini explanation**
   - Send angles (and exercise_id) to `POST /exercise-feedback` (or new endpoint).
   - Show Gemini’s response in a clear layout: what’s happening, why it’s wrong, why it feels wrong, how to fix it (and any safety tips).

6. **Visual polish**
   - Skeleton + angle labels on video.
   - Dedicated section or cards for “What’s wrong”, “Why it feels wrong”, “How to fix it”.
   - Optional: highlight joints or segments that need correction (e.g. color or label).

7. **Demo: squat**
   - End-to-end: user does squat in front of camera → skeleton visible → angles shown → Gemini feedback with full explanation.

---

## Current state (reference)

- **backend_test/posture_feedback:** Standalone API that accepts keypoints (or image) and returns Gemini “corrections” + “safety_tips”. No angle computation; no “what’s happening / why wrong / why feels wrong / how to fix” structure. Use as base and extend with angles + new prompt + React flow above.
