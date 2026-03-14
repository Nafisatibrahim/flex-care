// FlexCare – MediaPipe Pose squat demo
// Webcam -> PoseLandmarker (VIDEO mode) -> joint angles -> squat heuristics + overlay UI

import {
  PoseLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const videoEl = document.getElementById("webcam");
const canvasEl = document.getElementById("overlay");
const ctx = canvasEl.getContext("2d");

const webcamStatusEl = document.getElementById("webcamStatus");
const repStateEl = document.getElementById("repState");
const feedbackTextEl = document.getElementById("feedbackText");
const errorListEl = document.getElementById("errorList");

const angleKneeLEl = document.getElementById("angleKneeL");
const angleKneeREl = document.getElementById("angleKneeR");
const angleHipLEl = document.getElementById("angleHipL");
const angleHipREl = document.getElementById("angleHipR");
const angleTorsoEl = document.getElementById("angleTorso");

let poseLandmarker = null;
let lastVideoTime = -1;
let rafId = null;

// Simple squat state machine
const STATES = {
  STANDING: "STANDING",
  DESCENDING: "DESCENDING",
  BOTTOM: "BOTTOM",
  ASCENDING: "ASCENDING",
};

let repState = STATES.STANDING;
let minKneeAngleInRep = 180;

function setRepState(state) {
  repState = state;
  repStateEl.textContent = state;
}

function setFeedback(message, errors = []) {
  feedbackTextEl.textContent = message;
  errorListEl.innerHTML = "";
  errors.forEach((e) => {
    const li = document.createElement("li");
    li.textContent = e;
    errorListEl.appendChild(li);
  });
  // Optional: speak the main feedback
  if (window.speechSynthesis && message) {
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}

function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}

// 3D angle between vectors BA and BC with vertex at B
function calculateAngle(a, b, c) {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const baz = (a.z ?? 0) - (b.z ?? 0);
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const bcz = (c.z ?? 0) - (b.z ?? 0);

  const dot = bax * bcx + bay * bcy + baz * bcz;
  const magBA = Math.hypot(bax, bay, baz);
  const magBC = Math.hypot(bcx, bcy, bcz);
  if (magBA === 0 || magBC === 0) return 0;
  let cos = dot / (magBA * magBC);
  cos = Math.max(-1, Math.min(1, cos));
  return toDegrees(Math.acos(cos));
}

// MediaPipe Pose landmark indices (v0.10)
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;
const L_KNEE = 25;
const R_KNEE = 26;
const L_ANKLE = 27;
const R_ANKLE = 28;

// Head / ears
const NOSE = 0;
const L_EAR = 7;
const R_EAR = 8;

// Arms
const L_ELBOW = 13;
const R_ELBOW = 14;
const L_WRIST = 15;
const R_WRIST = 16;

// Feet (front of foot)
const L_FOOT = 31; // left_foot_index
const R_FOOT = 32; // right_foot_index

function kneeAngles(landmarks) {
  const left = calculateAngle(
    landmarks[L_HIP],
    landmarks[L_KNEE],
    landmarks[L_ANKLE]
  );
  const right = calculateAngle(
    landmarks[R_HIP],
    landmarks[R_KNEE],
    landmarks[R_ANKLE]
  );
  return { left, right };
}

function hipAngles(landmarks) {
  const left = calculateAngle(
    landmarks[L_SHOULDER],
    landmarks[L_HIP],
    landmarks[L_KNEE]
  );
  const right = calculateAngle(
    landmarks[R_SHOULDER],
    landmarks[R_HIP],
    landmarks[R_KNEE]
  );
  return { left, right };
}

// Approximate torso lean using vector from hips to shoulders vs vertical
function torsoLean(landmarks) {
  const midHipX = (landmarks[L_HIP].x + landmarks[R_HIP].x) / 2;
  const midHipY = (landmarks[L_HIP].y + landmarks[R_HIP].y) / 2;
  const midShoulderX =
    (landmarks[L_SHOULDER].x + landmarks[R_SHOULDER].x) / 2;
  const midShoulderY =
    (landmarks[L_SHOULDER].y + landmarks[R_SHOULDER].y) / 2;

  const vx = midShoulderX - midHipX;
  const vy = midShoulderY - midHipY;
  const vMag = Math.hypot(vx, vy);
  if (!vMag) return 0;

  // Vertical vector (straight up): (0, -1)
  const dot = vx * 0 + vy * -1;
  let cos = dot / vMag;
  cos = Math.max(-1, Math.min(1, cos));
  const angleFromVertical = toDegrees(Math.acos(cos));
  return angleFromVertical; // 0 = upright, >0 = leaning
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Approximate head/upper-back posture
function headForwardOffset(landmarks) {
  const midShoulderX = (landmarks[L_SHOULDER].x + landmarks[R_SHOULDER].x) / 2;
  const midShoulderY = (landmarks[L_SHOULDER].y + landmarks[R_SHOULDER].y) / 2;

  const midHeadX =
    (landmarks[NOSE].x + landmarks[L_EAR].x + landmarks[R_EAR].x) / 3;
  const midHeadY =
    (landmarks[NOSE].y + landmarks[L_EAR].y + landmarks[R_EAR].y) / 3;

  const dx = midHeadX - midShoulderX;

  const torsoLen = distance2D(
    { x: midShoulderX, y: midShoulderY },
    {
      x: (landmarks[L_HIP].x + landmarks[R_HIP].x) / 2,
      y: (landmarks[L_HIP].y + landmarks[R_HIP].y) / 2,
    }
  );
  if (!torsoLen) return 0;

  return dx / torsoLen;
}

// Angle at shoulder between hip–shoulder–ear: larger angle ≈ more rounding
function upperBackAngle(landmarks, isLeft) {
  const SHOULDER = isLeft ? L_SHOULDER : R_SHOULDER;
  const HIP = isLeft ? L_HIP : R_HIP;
  const EAR = isLeft ? L_EAR : R_EAR;
  return calculateAngle(landmarks[HIP], landmarks[SHOULDER], landmarks[EAR]);
}

function midPoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Horizontal deviation of "bar" (wrists midpoint) from mid-foot
function barOverFootOffset(landmarks) {
  const bar = midPoint(landmarks[L_WRIST], landmarks[R_WRIST]);
  const midFoot = midPoint(landmarks[L_FOOT], landmarks[R_FOOT]);
  const hipWidth = distance2D(landmarks[L_HIP], landmarks[R_HIP]);
  if (!hipWidth) return 0;
  return (bar.x - midFoot.x) / hipWidth;
}

function elbowHeightMetric(landmarks, isLeft) {
  const SHOULDER = isLeft ? L_SHOULDER : R_SHOULDER;
  const ELBOW = isLeft ? L_ELBOW : R_ELBOW;

  const dy = landmarks[ELBOW].y - landmarks[SHOULDER].y;
  const upperArmLen = distance2D(landmarks[SHOULDER], landmarks[ELBOW]) || 1;
  return dy / upperArmLen;
}

function elbowAngle(landmarks, isLeft) {
  const SHOULDER = isLeft ? L_SHOULDER : R_SHOULDER;
  const ELBOW = isLeft ? L_ELBOW : R_ELBOW;
  const WRIST = isLeft ? L_WRIST : R_WRIST;
  return calculateAngle(landmarks[SHOULDER], landmarks[ELBOW], landmarks[WRIST]);
}

function drawSkeleton(landmarks, options) {
  const {
    good = false,
    depthIssue = false,
    kneeIssue = false,
    backIssue = false,
    headForwardIssue = false,
    upperBackIssue = false,
    barPathIssue = false,
    elbowsTooLow = false,
    wristsOverExtended = false,
  } = options;

  const width = canvasEl.width;
  const height = canvasEl.height;

  ctx.clearRect(0, 0, width, height);

  function p(i) {
    return {
      x: landmarks[i].x * width,
      y: landmarks[i].y * height,
    };
  }

  // Helper to draw a colored segment
  function segment(i, j, color) {
    const a = p(i);
    const b = p(j);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  const baseColor = "#e5e7eb";
  const goodColor = "#22c55e";
  const badColor = "#ef4444";

  const anyUpperBackIssue = backIssue || headForwardIssue || upperBackIssue;
  const anyArmIssue = barPathIssue || elbowsTooLow || wristsOverExtended;

  // Legs
  const leftLegColor =
    kneeIssue || depthIssue ? badColor : good ? goodColor : baseColor;
  const rightLegColor =
    kneeIssue || depthIssue ? badColor : good ? goodColor : baseColor;

  segment(L_HIP, L_KNEE, leftLegColor);
  segment(L_KNEE, L_ANKLE, leftLegColor);
  segment(R_HIP, R_KNEE, rightLegColor);
  segment(R_KNEE, R_ANKLE, rightLegColor);

  // Torso
  const torsoColor = anyUpperBackIssue ? badColor : good ? goodColor : baseColor;
  segment(L_SHOULDER, L_HIP, torsoColor);
  segment(R_SHOULDER, R_HIP, torsoColor);
  segment(L_SHOULDER, R_SHOULDER, torsoColor);
  segment(L_HIP, R_HIP, torsoColor);

  // Arms
  const armColor = anyArmIssue ? badColor : good ? goodColor : baseColor;
  segment(L_SHOULDER, L_ELBOW, armColor);
  segment(L_ELBOW, L_WRIST, armColor);
  segment(R_SHOULDER, R_ELBOW, armColor);
  segment(R_ELBOW, R_WRIST, armColor);

  // Draw joints as small circles
  ctx.fillStyle = "#38bdf8";
  [
    L_SHOULDER,
    R_SHOULDER,
    L_HIP,
    R_HIP,
    L_KNEE,
    R_KNEE,
    L_ANKLE,
    R_ANKLE,
    L_ELBOW,
    R_ELBOW,
    L_WRIST,
    R_WRIST,
  ].forEach((idx) => {
    const { x, y } = p(idx);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateAnglesUI(knees, hips, torso) {
  angleKneeLEl.textContent = `${knees.left.toFixed(0)}°`;
  angleKneeREl.textContent = `${knees.right.toFixed(0)}°`;
  angleHipLEl.textContent = `${hips.left.toFixed(0)}°`;
  angleHipREl.textContent = `${hips.right.toFixed(0)}°`;
  angleTorsoEl.textContent = `${torso.toFixed(0)}°`;
}

function updateHeuristics(knees, hips, torso, landmarks) {
  const avgKnee = (knees.left + knees.right) / 2;
  const avgHip = (hips.left + hips.right) / 2;

  // Track minimum knee angle for current rep
  if (avgKnee < minKneeAngleInRep) {
    minKneeAngleInRep = avgKnee;
  }

  // Simple heuristic thresholds
  const depthThreshold = 95; // below this = deep enough
  const torsoLeanWarn = 25; // degrees from vertical
  const headForwardWarn = 0.25; // torso lengths in front of shoulders
  const upperBackAngleWarn = 165; // smaller = more rounding
  const barOffsetWarn = 0.25; // 25% of hip width

  // Knee cave: compare distance between knees vs hips
  const midLeftKnee = landmarks[L_KNEE];
  const midRightKnee = landmarks[R_KNEE];
  const midLeftHip = landmarks[L_HIP];
  const midRightHip = landmarks[R_HIP];
  const kneeDist = distance2D(midLeftKnee, midRightKnee);
  const hipDist = distance2D(midLeftHip, midRightHip);
  const kneeCave = kneeDist < hipDist * 0.8;

  const depthIssue = avgKnee > depthThreshold && repState === STATES.BOTTOM;
  const backIssue = torso > torsoLeanWarn;

  const headOffset = headForwardOffset(landmarks);
  const upperBackLeft = upperBackAngle(landmarks, true);
  const upperBackRight = upperBackAngle(landmarks, false);

  const headForwardIssue = Math.abs(headOffset) > headForwardWarn;
  const upperBackIssue =
    upperBackLeft < upperBackAngleWarn || upperBackRight < upperBackAngleWarn;

  const barOffset = barOverFootOffset(landmarks);
  const barPathIssue = Math.abs(barOffset) > barOffsetWarn;

  const elbowHeightL = elbowHeightMetric(landmarks, true);
  const elbowHeightR = elbowHeightMetric(landmarks, false);
  const elbowAngleL = elbowAngle(landmarks, true);
  const elbowAngleR = elbowAngle(landmarks, false);

  const elbowsTooLow = elbowHeightL > 0.5 || elbowHeightR > 0.5;
  const wristsOverExtended = elbowAngleL < 140 || elbowAngleR < 140;

  const errors = [];
  if (depthIssue) errors.push("Go deeper – bend your knees more at the bottom.");
  if (kneeCave) errors.push("Knees out – keep them tracking over your toes.");
  if (backIssue) errors.push("Keep your chest up – avoid rounding your back.");
  if (headForwardIssue)
    errors.push("Keep your head over your torso – avoid craning forward.");
  if (upperBackIssue)
    errors.push("Open your chest and pull your shoulders back.");
  if (barPathIssue)
    errors.push("Keep the bar roughly over mid-foot throughout the squat.");
  if (elbowsTooLow)
    errors.push("Drive your elbows up to keep the chest proud.");
  if (wristsOverExtended)
    errors.push("Avoid cranking your wrists – adjust bar grip.");

  let good = false;

  // State machine transitions based on average knee angle
  if (repState === STATES.STANDING && avgKnee < 160) {
    setRepState(STATES.DESCENDING);
  }
  if (repState === STATES.DESCENDING && avgKnee < 110) {
    setRepState(STATES.BOTTOM);
  }
  if (repState === STATES.BOTTOM && avgKnee > 120) {
    setRepState(STATES.ASCENDING);
  }
  if (repState === STATES.ASCENDING && avgKnee > 165) {
    // Rep completed, evaluate depth
    if (minKneeAngleInRep <= depthThreshold) {
      good = !kneeCave && !backIssue;
      if (good) {
        setFeedback("Nice rep – depth looks good!", []);
      } else if (!depthIssue && (kneeCave || backIssue)) {
        setFeedback("Rep depth ok – adjust form.", errors);
      } else {
        setFeedback("Rep complete – see tips below.", errors);
      }
    } else {
      setFeedback("Rep too shallow – try to go deeper.", errors);
    }
    // Reset for next rep
    setRepState(STATES.STANDING);
    minKneeAngleInRep = 180;
  } else if (repState !== STATES.STANDING) {
    // In the middle of a rep, provide real-time cue
    if (errors.length) {
      setFeedback("Adjust your form as you move.", errors);
    } else {
      setFeedback("Good path – keep moving smoothly.", []);
    }
  }

  return {
    depthIssue,
    kneeIssue: kneeCave,
    backIssue,
    headForwardIssue,
    upperBackIssue,
    barPathIssue,
    elbowsTooLow,
    wristsOverExtended,
    good,
  };
}

async function createPoseLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
  });
}

async function initWebcam() {
  if (!navigator.mediaDevices?.getUserMedia) {
    webcamStatusEl.textContent = "getUserMedia not supported in this browser.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 360 },
      audio: false,
    });
    videoEl.srcObject = stream;
    webcamStatusEl.textContent = "Camera ready. Start squatting!";
  } catch (err) {
    console.error(err);
    webcamStatusEl.textContent =
      "Could not access camera. Check permissions and HTTPS.";
  }
}

function startLoop() {
  const processFrame = () => {
    if (!poseLandmarker || videoEl.readyState < 2) {
      rafId = requestAnimationFrame(processFrame);
      return;
    }

    if (
      canvasEl.width !== videoEl.videoWidth ||
      canvasEl.height !== videoEl.videoHeight
    ) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
    }

    if (videoEl.currentTime === lastVideoTime) {
      rafId = requestAnimationFrame(processFrame);
      return;
    }
    lastVideoTime = videoEl.currentTime;

    const result = poseLandmarker.detectForVideo(videoEl, performance.now());
    if (result && result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      const knees = kneeAngles(landmarks);
      const hips = hipAngles(landmarks);
      const torso = torsoLean(landmarks);
      updateAnglesUI(knees, hips, torso);
      const flags = updateHeuristics(knees, hips, torso, landmarks);
      drawSkeleton(landmarks, flags);
    } else {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }

    rafId = requestAnimationFrame(processFrame);
  };

  if (rafId !== null) cancelAnimationFrame(rafId);
  processFrame();
}

async function main() {
  await initWebcam();
  await createPoseLandmarker();
  setRepState(STATES.STANDING);
  setFeedback("Camera and model loaded. Try a slow, controlled squat.");
  startLoop();
}

main().catch((err) => {
  console.error(err);
  setFeedback("Error initialising MediaPipe Pose.", [String(err)]);
});

