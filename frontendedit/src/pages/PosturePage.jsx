import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/* ── Constants (MediaPipe landmark indices) ─────────────── */
const L_SHOULDER=11,R_SHOULDER=12,L_HIP=23,R_HIP=24
const L_KNEE=25,R_KNEE=26,L_ANKLE=27,R_ANKLE=28
const NOSE=0,L_EAR=7,R_EAR=8
const L_ELBOW=13,R_ELBOW=14,L_WRIST=15,R_WRIST=16
const L_FOOT=31,R_FOOT=32

const STATES = { STANDING:'STANDING', DESCENDING:'DESCENDING', BOTTOM:'BOTTOM', ASCENDING:'ASCENDING' }
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

/* ── Exercise catalogue ─────────────────────────────────── */
const EXERCISES = [
  { id:'squat',    label:'Squat',           mode:'knee',  tips:['Feet shoulder-width apart','Knees track over toes','Hip crease below knees at depth'] },
  { id:'lunge',    label:'Lunge',           mode:'knee',  tips:['Step forward, lower back knee toward floor','Front knee stays over ankle','Keep torso upright'] },
  { id:'goblet',   label:'Goblet Squat',    mode:'knee',  tips:['Hold weight at chest','Elbows inside knees at bottom','Deep squat with upright torso'] },
  { id:'deadlift', label:'Deadlift',        mode:'hip',   tips:['Hip hinge — push hips back','Neutral spine throughout','Drive hips through at the top'] },
  { id:'rdl',      label:'RDL / Hip Hinge', mode:'hip',   tips:['Soft knee bend, hinge from hips','Bar stays close to legs','Feel hamstring stretch at bottom'] },
  { id:'pushup',   label:'Push-up',         mode:'elbow', tips:['Straight body from head to heel','Lower chest to just above floor','Full lockout at top'] },
  { id:'press',    label:'Shoulder Press',  mode:'elbow', tips:['Core tight, ribs down','Press directly overhead','Control the descent'] },
  { id:'curl',     label:'Bicep Curl',      mode:'elbow', tips:['Elbows pinned to sides','Full extension at bottom','Squeeze at top'] },
]
const EX_BY_ID = Object.fromEntries(EXERCISES.map(e => [e.id, e]))

/* ── Math helpers ───────────────────────────────────────── */
function toDeg(r){ return r*180/Math.PI }
function calcAngle(a,b,c){
  const bax=a.x-b.x,bay=a.y-b.y,baz=(a.z??0)-(b.z??0)
  const bcx=c.x-b.x,bcy=c.y-b.y,bcz=(c.z??0)-(b.z??0)
  const dot=bax*bcx+bay*bcy+baz*bcz
  const mBA=Math.hypot(bax,bay,baz),mBC=Math.hypot(bcx,bcy,bcz)
  if(!mBA||!mBC) return 0
  return toDeg(Math.acos(Math.max(-1,Math.min(1,dot/(mBA*mBC)))))
}
function dist2D(a,b){ return Math.hypot(a.x-b.x,a.y-b.y) }
function mid(a,b){ return {x:(a.x+b.x)/2,y:(a.y+b.y)/2} }

function kneeAngles(lm){
  return { left: calcAngle(lm[L_HIP],lm[L_KNEE],lm[L_ANKLE]), right: calcAngle(lm[R_HIP],lm[R_KNEE],lm[R_ANKLE]) }
}
function hipAngles(lm){
  return { left: calcAngle(lm[L_SHOULDER],lm[L_HIP],lm[L_KNEE]), right: calcAngle(lm[R_SHOULDER],lm[R_HIP],lm[R_KNEE]) }
}
function torsoLean(lm){
  const mHX=(lm[L_HIP].x+lm[R_HIP].x)/2, mHY=(lm[L_HIP].y+lm[R_HIP].y)/2
  const mSX=(lm[L_SHOULDER].x+lm[R_SHOULDER].x)/2, mSY=(lm[L_SHOULDER].y+lm[R_SHOULDER].y)/2
  const vx=mSX-mHX,vy=mSY-mHY,vm=Math.hypot(vx,vy)
  if(!vm) return 0
  return toDeg(Math.acos(Math.max(-1,Math.min(1,(vx*0+vy*-1)/vm))))
}
function headForwardOffset(lm){
  const mSX=(lm[L_SHOULDER].x+lm[R_SHOULDER].x)/2,mSY=(lm[L_SHOULDER].y+lm[R_SHOULDER].y)/2
  const mHX=(lm[NOSE].x+lm[L_EAR].x+lm[R_EAR].x)/3
  const tLen=dist2D({x:mSX,y:mSY},{x:(lm[L_HIP].x+lm[R_HIP].x)/2,y:(lm[L_HIP].y+lm[R_HIP].y)/2})
  return tLen?((mHX-mSX)/tLen):0
}
function upperBackAngle(lm,left){
  const S=left?L_SHOULDER:R_SHOULDER,H=left?L_HIP:R_HIP,E=left?L_EAR:R_EAR
  return calcAngle(lm[H],lm[S],lm[E])
}
function barOverFootOffset(lm){
  const bar=mid(lm[L_WRIST],lm[R_WRIST]),mf=mid(lm[L_FOOT],lm[R_FOOT])
  const hw=dist2D(lm[L_HIP],lm[R_HIP])
  return hw?((bar.x-mf.x)/hw):0
}
function elbowHeight(lm,left){
  const S=left?L_SHOULDER:R_SHOULDER,El=left?L_ELBOW:R_ELBOW
  const dy=lm[El].y-lm[S].y,len=dist2D(lm[S],lm[El])||1
  return dy/len
}
function elbowAngleFn(lm,left){
  const S=left?L_SHOULDER:R_SHOULDER,El=left?L_ELBOW:R_ELBOW,W=left?L_WRIST:R_WRIST
  return calcAngle(lm[S],lm[El],lm[W])
}

/* ── Skeleton draw ──────────────────────────────────────── */
function drawSkeleton(ctx,lm,W,H,flags){
  const {good,depthIssue,kneeIssue,backIssue,headForwardIssue,upperBackIssue,barPathIssue,elbowsTooLow,wristsOverExtended}=flags
  ctx.clearRect(0,0,W,H)
  const p=i=>({x:lm[i].x*W,y:lm[i].y*H})
  const seg=(i,j,c)=>{
    const a=p(i),b=p(j)
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)
    ctx.strokeStyle=c;ctx.lineWidth=4;ctx.stroke()
  }
  const BASE='#94a3b8',GOOD='#22c55e',BAD='#ef4444'
  const legC=kneeIssue||depthIssue?BAD:good?GOOD:BASE
  const torsoC=backIssue||headForwardIssue||upperBackIssue?BAD:good?GOOD:BASE
  const armC=barPathIssue||elbowsTooLow||wristsOverExtended?BAD:good?GOOD:BASE
  seg(L_HIP,L_KNEE,legC);seg(L_KNEE,L_ANKLE,legC)
  seg(R_HIP,R_KNEE,legC);seg(R_KNEE,R_ANKLE,legC)
  seg(L_SHOULDER,L_HIP,torsoC);seg(R_SHOULDER,R_HIP,torsoC)
  seg(L_SHOULDER,R_SHOULDER,torsoC);seg(L_HIP,R_HIP,torsoC)
  seg(L_SHOULDER,L_ELBOW,armC);seg(L_ELBOW,L_WRIST,armC)
  seg(R_SHOULDER,R_ELBOW,armC);seg(R_ELBOW,R_WRIST,armC)
  ctx.fillStyle='#38bdf8'
  ;[L_SHOULDER,R_SHOULDER,L_HIP,R_HIP,L_KNEE,R_KNEE,L_ANKLE,R_ANKLE,L_ELBOW,R_ELBOW,L_WRIST,R_WRIST].forEach(idx=>{
    const {x,y}=p(idx)
    ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill()
  })
}

/* ── Rep state badge colors ─────────────────────────────── */
const STATE_COLOR = {
  STANDING:   'bg-gray-100 text-gray-500',
  DESCENDING: 'bg-amber-100 text-amber-700',
  BOTTOM:     'bg-red-100 text-red-700',
  ASCENDING:  'bg-emerald-100 text-emerald-700',
}
const STATE_LABEL = { STANDING:'Standing',DESCENDING:'Going down',BOTTOM:'Bottom',ASCENDING:'Coming up' }

/* ── Main component ─────────────────────────────────────── */
export default function PosturePage() {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const landmarker = useRef(null)
  const rafRef     = useRef(null)
  const lastTime   = useRef(-1)
  const repStateR  = useRef(STATES.STANDING)
  const minKnee    = useRef(180)

  const [started,    setStarted]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [camStatus,  setCamStatus]  = useState('')
  const [repState,   setRepState]   = useState(STATES.STANDING)
  const [feedback,   setFeedback]   = useState('Stand in view of the camera, then press Start.')
  const [errors,     setErrors]     = useState([])
  const [angles,     setAngles]     = useState({ kneeL:0,kneeR:0,hipL:0,hipR:0,torso:0 })
  const [repCount,   setRepCount]   = useState(0)
  const [goodReps,   setGoodReps]   = useState(0)
  const [sessionLogged, setSessionLogged] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState('squat')
  const exerciseModeRef = useRef('knee')

  function changeExercise(id) {
    setSelectedExercise(id)
    exerciseModeRef.current = EX_BY_ID[id]?.mode || 'knee'
    setRepCount(0); setGoodReps(0); setSessionLogged(false)
    updateRepState(STATES.STANDING)
    minKnee.current = 180
    setFeedback(`Ready for ${EX_BY_ID[id]?.label}. Start when ready.`)
    setErrors([])
  }

  function logSessionToTracker() {
    const ex = EX_BY_ID[selectedExercise]
    const accuracy = repCount ? Math.round((goodReps / repCount) * 100) : null
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date: new Date().toISOString(),
      exercise: `${ex?.label || 'Exercise'} (AI Tracked)`,
      reps: repCount,
      sets: null,
      duration: null,
      notes: accuracy != null ? `${goodReps} good reps, ${repCount - goodReps} with form issues. ${accuracy}% accuracy.` : '',
      accuracy,
      source: 'posture',
    }
    try {
      const key = 'flexcare_exercise_logs'
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.unshift(entry)
      localStorage.setItem(key, JSON.stringify(existing))
      setSessionLogged(true)
    } catch { }
  }

  function updateRepState(s){
    repStateR.current=s
    setRepState(s)
  }

  function speak(msg){
    if(window.speechSynthesis&&msg){
      const u=new SpeechSynthesisUtterance(msg)
      u.rate=1.0
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    }
  }

  function runHeuristics(knees,hips,torso,lm){
    const mode = exerciseModeRef.current
    const avgKnee = (knees.left+knees.right)/2
    const avgHip  = (hips.left+hips.right)/2
    const avgElbow = (elbowAngleFn(lm,true)+elbowAngleFn(lm,false))/2

    /* ── shared form checks ── */
    const kneeDist=dist2D(lm[L_KNEE],lm[R_KNEE]),hipDist=dist2D(lm[L_HIP],lm[R_HIP])
    const kneeCave=kneeDist<hipDist*0.8
    const backIssue=torso>25
    const headIssue=Math.abs(headForwardOffset(lm))>0.25
    const upperIssue=upperBackAngle(lm,true)<165||upperBackAngle(lm,false)<165
    const barIssue=Math.abs(barOverFootOffset(lm))>0.25
    const elbowLow=elbowHeight(lm,true)>0.5||elbowHeight(lm,false)>0.5
    const wristOver=elbowAngleFn(lm,true)<140||elbowAngleFn(lm,false)<140

    let errs=[], good=false
    const flags = { depthIssue:false, kneeIssue:kneeCave, backIssue, headForwardIssue:headIssue,
                    upperBackIssue:upperIssue, barPathIssue:false, elbowsTooLow:false,
                    wristsOverExtended:false, good:false }

    /* ══ KNEE MODE (squat / lunge / goblet) ══ */
    if(mode==='knee'){
      if(avgKnee<minKnee.current) minKnee.current=avgKnee
      const depthIssue=avgKnee>95&&repStateR.current===STATES.BOTTOM
      flags.depthIssue=depthIssue; flags.barPathIssue=barIssue
      flags.elbowsTooLow=elbowLow; flags.wristsOverExtended=wristOver
      if(depthIssue) errs.push('Go deeper — bend your knees more.')
      if(kneeCave)   errs.push('Knees out — track them over your toes.')
      if(backIssue)  errs.push('Chest up — avoid rounding your back.')
      if(headIssue)  errs.push('Keep your head over your torso.')
      if(upperIssue) errs.push('Open your chest — pull shoulders back.')
      if(barIssue)   errs.push('Keep the bar over mid-foot.')
      if(elbowLow)   errs.push('Drive elbows up to keep chest proud.')
      if(wristOver)  errs.push('Adjust grip — avoid cranking wrists.')

      if(repStateR.current===STATES.STANDING&&avgKnee<160)   updateRepState(STATES.DESCENDING)
      if(repStateR.current===STATES.DESCENDING&&avgKnee<110) updateRepState(STATES.BOTTOM)
      if(repStateR.current===STATES.BOTTOM&&avgKnee>120)     updateRepState(STATES.ASCENDING)
      if(repStateR.current===STATES.ASCENDING&&avgKnee>165){
        setRepCount(c=>c+1)
        if(minKnee.current<=95){
          good=!kneeCave&&!backIssue
          if(good){ setGoodReps(g=>g+1); setFeedback('Nice rep — depth looks good!'); setErrors([]); speak('Nice rep') }
          else     { setFeedback('Rep depth ok — check form.'); setErrors(errs); if(errs[0]) speak(errs[0]) }
        } else {
          setFeedback('Rep too shallow — try to go deeper.'); setErrors(['Didn\'t reach depth threshold.']); speak('Go deeper')
        }
        updateRepState(STATES.STANDING); minKnee.current=180
      } else if(repStateR.current!==STATES.STANDING){
        if(errs.length){ setFeedback('Adjust your form.'); setErrors(errs) }
        else            { setFeedback('Good path — keep moving.'); setErrors([]) }
      }
    }

    /* ══ HIP MODE (deadlift / RDL) ══ */
    else if(mode==='hip'){
      const hipBack = backIssue
      if(hipBack) errs.push('Neutral spine — avoid rounding your lower back.')
      if(headIssue) errs.push('Keep your neck in line with your spine.')

      if(repStateR.current===STATES.STANDING&&avgHip<155)    updateRepState(STATES.DESCENDING)
      if(repStateR.current===STATES.DESCENDING&&avgHip<105)  updateRepState(STATES.BOTTOM)
      if(repStateR.current===STATES.BOTTOM&&avgHip>115)      updateRepState(STATES.ASCENDING)
      if(repStateR.current===STATES.ASCENDING&&avgHip>155){
        setRepCount(c=>c+1)
        good=!hipBack
        if(good){ setGoodReps(g=>g+1); setFeedback('Clean rep — hips locked out!'); setErrors([]); speak('Nice rep') }
        else     { setFeedback('Rep done — work on spine position.'); setErrors(errs); if(errs[0]) speak(errs[0]) }
        updateRepState(STATES.STANDING)
      } else if(repStateR.current!==STATES.STANDING){
        if(errs.length){ setFeedback('Adjust your form.'); setErrors(errs) }
        else            { setFeedback('Good hinge — keep moving.'); setErrors([]) }
      }
    }

    /* ══ ELBOW MODE (push-up / press / curl) ══ */
    else if(mode==='elbow'){
      if(avgElbow<minKnee.current) minKnee.current=avgElbow  // reuse minKnee ref as minAngle
      const fullRange = minKnee.current<=100
      if(backIssue) errs.push('Keep your core tight and body straight.')

      if(repStateR.current===STATES.STANDING&&avgElbow<150)   updateRepState(STATES.DESCENDING)
      if(repStateR.current===STATES.DESCENDING&&avgElbow<100) updateRepState(STATES.BOTTOM)
      if(repStateR.current===STATES.BOTTOM&&avgElbow>115)     updateRepState(STATES.ASCENDING)
      if(repStateR.current===STATES.ASCENDING&&avgElbow>150){
        setRepCount(c=>c+1)
        if(fullRange){
          good=!backIssue
          if(good){ setGoodReps(g=>g+1); setFeedback('Full range — great rep!'); setErrors([]); speak('Nice rep') }
          else     { setFeedback('Range ok — watch your form.'); setErrors(errs); if(errs[0]) speak(errs[0]) }
        } else {
          setFeedback('Partial range — try to go lower.'); setErrors(['Work through full range of motion.']); speak('Go lower')
        }
        updateRepState(STATES.STANDING); minKnee.current=180
      } else if(repStateR.current!==STATES.STANDING){
        if(errs.length){ setFeedback('Adjust your form.'); setErrors(errs) }
        else            { setFeedback('Good path — keep moving.'); setErrors([]) }
      }
    }

    flags.good=good
    return flags
  }

  function startLoop(){
    const video=videoRef.current, canvas=canvasRef.current
    const ctx=canvas.getContext('2d')

    const loop=()=>{
      if(!landmarker.current||video.readyState<2){ rafRef.current=requestAnimationFrame(loop); return }
      if(canvas.width!==video.videoWidth)  canvas.width=video.videoWidth
      if(canvas.height!==video.videoHeight) canvas.height=video.videoHeight
      if(video.currentTime===lastTime.current){ rafRef.current=requestAnimationFrame(loop); return }
      lastTime.current=video.currentTime

      const res=landmarker.current.detectForVideo(video,performance.now())
      if(res?.landmarks?.length>0){
        const lm=res.landmarks[0]
        const k=kneeAngles(lm),h=hipAngles(lm),t=torsoLean(lm)
        setAngles({kneeL:k.left,kneeR:k.right,hipL:h.left,hipR:h.right,torso:t})
        const flags=runHeuristics(k,h,t,lm)
        drawSkeleton(ctx,lm,canvas.width,canvas.height,flags)
      } else {
        ctx.clearRect(0,0,canvas.width,canvas.height)
      }
      rafRef.current=requestAnimationFrame(loop)
    }
    if(rafRef.current) cancelAnimationFrame(rafRef.current)
    loop()
  }

  async function handleStart(){
    setLoading(true)
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:360},audio:false})
      videoRef.current.srcObject=stream
      setCamStatus('Camera ready')

      const {PoseLandmarker,FilesetResolver}=await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0'
      )
      const vision=await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      )
      landmarker.current=await PoseLandmarker.createFromOptions(vision,{
        baseOptions:{modelAssetPath:MODEL_URL},
        runningMode:'VIDEO',numPoses:1,
        minPoseDetectionConfidence:0.5,minPosePresenceConfidence:0.5,
      })
      setFeedback('Model loaded. Perform a slow, controlled squat.')
      setStarted(true)
      startLoop()
    } catch(e){
      setCamStatus('Camera error: '+e.message)
      setFeedback('Could not start. Check camera permissions and that you\'re on HTTPS.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current) },[])

  const hasErrors = errors.length > 0
  const accuracy  = repCount ? Math.round((goodReps/repCount)*100) : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Mini nav ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-indigo-600 to-violet-600
                            flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <span className="font-extrabold text-[17px] text-gray-900 tracking-tight">FlexCare</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-gray-400 font-medium">Exercise Tracker</span>
            <Link to="/"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500
                         hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* ── Page header ─────────────────────────────────── */}
        <div className="mb-8">
          <div className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100
                          text-indigo-600 text-xs font-semibold px-3 py-1 mb-3">
            Live AI Posture Tracking
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">AI Exercise Tracker</h1>
          <p className="mt-1.5 text-gray-500 text-base max-w-xl">
            Your webcam feed is processed locally — nothing is uploaded. The AI tracks your joints in
            real time and counts reps with form feedback for each exercise.
          </p>
        </div>

        {/* ── Two-col layout ───────────────────────────────── */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* ─ Video + canvas ─ */}
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="relative bg-gray-900 aspect-video w-full">
              <video ref={videoRef} autoPlay playsInline muted
                className="absolute inset-0 w-full h-full object-cover"/>
              <canvas ref={canvasRef}
                className="absolute inset-0 w-full h-full"/>

              {!started && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gray-950/80">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-400/30
                                  flex items-center justify-center">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg mb-1">Camera not started</p>
                    <p className="text-gray-400 text-sm">Stand back so your full body is in frame</p>
                  </div>
                  <button onClick={handleStart} disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white
                               font-bold px-6 py-3 rounded-xl transition-colors shadow-lg disabled:opacity-60">
                    {loading
                      ? <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"/>Loading model…</>
                      : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/>
                          </svg>Start camera</>}
                  </button>
                  {camStatus && <p className="text-red-400 text-xs mt-1">{camStatus}</p>}
                </div>
              )}
            </div>

            {/* Live angles bar */}
            {started && (
              <div className="grid grid-cols-5 divide-x divide-gray-100 border-t border-gray-100">
                {[
                  {label:'Knee L', val:angles.kneeL},
                  {label:'Knee R', val:angles.kneeR},
                  {label:'Hip L',  val:angles.hipL},
                  {label:'Hip R',  val:angles.hipR},
                  {label:'Torso',  val:angles.torso},
                ].map(a=>(
                  <div key={a.label} className="flex flex-col items-center py-3 px-2">
                    <span className="text-[11px] font-medium text-gray-400">{a.label}</span>
                    <span className="text-[15px] font-bold text-gray-800 mt-0.5">{a.val.toFixed(0)}°</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─ Feedback panel ─ */}
          <div className="flex flex-col gap-4">

            {/* Exercise picker */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Exercise</p>
              <div className="grid grid-cols-2 gap-1.5">
                {EXERCISES.map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => changeExercise(ex.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition
                      ${selectedExercise === ex.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
              {selectedExercise !== 'squat' && (
                <p className="mt-2 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                  Rep counting tuned for {EX_BY_ID[selectedExercise]?.label}. Best with full body in frame.
                </p>
              )}
            </div>

            {/* Rep state */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Rep state</p>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(STATES).map(s=>(
                  <span key={s}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all
                      ${repState===s ? STATE_COLOR[s]+' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-400'}`}>
                    {STATE_LABEL[s]}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Session stats</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {label:'Total reps',  val:repCount},
                  {label:'Good reps',   val:goodReps},
                  {label:'Accuracy',    val:accuracy!=null?`${accuracy}%`:'—'},
                ].map(s=>(
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-extrabold text-gray-900">{s.val}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
              {repCount > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={logSessionToTracker}
                    disabled={sessionLogged}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-emerald-600 text-white text-xs font-semibold transition"
                  >
                    {sessionLogged ? (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                      </svg>Logged to Tracker</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                      </svg>Log session to Tracker</>
                    )}
                  </button>
                  {sessionLogged && (
                    <Link to="/tracker" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold px-3 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-50 transition whitespace-nowrap">
                      View →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Feedback */}
            <div className={`rounded-2xl shadow-card p-5 transition-colors
              ${hasErrors ? 'bg-red-50 border border-red-100' : started ? 'bg-emerald-50 border border-emerald-100' : 'bg-white'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${hasErrors?'bg-red-400':started?'bg-emerald-400':'bg-gray-300'}`}/>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Feedback</p>
              </div>
              <p className={`text-sm font-semibold leading-relaxed ${hasErrors?'text-red-800':started?'text-emerald-800':'text-gray-600'}`}>
                {feedback}
              </p>
              {errors.length>0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {errors.map((e,i)=>(
                    <li key={i} className="flex gap-2 text-sm text-red-700">
                      <span className="text-red-400 flex-none">⚠</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tips */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                {EX_BY_ID[selectedExercise]?.label} tips
              </p>
              <ul className="flex flex-col gap-2">
                {['Stand 1–2 m from camera, full body visible',
                  'Good lighting helps the model track you',
                  ...( EX_BY_ID[selectedExercise]?.tips || [])
                ].map((t,i)=>(
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-indigo-400 font-bold flex-none">{i+1}.</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
