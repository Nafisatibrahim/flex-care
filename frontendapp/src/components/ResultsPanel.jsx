import ExerciseCapture from './ExerciseCapture'
import ReferralBlock from './ReferralBlock'
import { REGION_LABELS } from '../constants/regions'

/* ── Heat colours ──────────────────────────────────────── */
const HEAT = ['#22c55e','#86efac','#fde68a','#fbbf24','#fb923c','#f97316','#ef4444','#dc2626','#b91c1c','#7f1d1d']
const heatColor = v => HEAT[Math.max(0, Math.min(9, v - 1))]
const heatBg    = v => heatColor(v) + '22'

/* ── Severity label ────────────────────────────────────── */
function severityLabel(avg) {
  if (avg <= 2) return { label: 'Very mild',  color: 'text-green-600',  bg: 'bg-green-50'  }
  if (avg <= 4) return { label: 'Mild',        color: 'text-lime-600',   bg: 'bg-lime-50'   }
  if (avg <= 6) return { label: 'Moderate',    color: 'text-amber-600',  bg: 'bg-amber-50'  }
  if (avg <= 8) return { label: 'Severe',      color: 'text-orange-600', bg: 'bg-orange-50' }
  return               { label: 'Very severe', color: 'text-red-600',    bg: 'bg-red-50'    }
}

/* ── Action icons (keyword-matched) ───────────────────── */
function ActionIcon({ text }) {
  const t = text.toLowerCase()

  if (/ice|cold|cool|frozen/.test(t)) return (
    <svg className="w-5 h-5 text-sky-400 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M5.636 5.636l12.728 12.728M18.364 5.636 5.636 18.364"/>
    </svg>
  )
  if (/heat|warm|hot/.test(t)) return (
    <svg className="w-5 h-5 text-orange-400 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-13l-.87.5M4.21 17.5l-.87.5M20.66 17.5l-.87-.5M4.21 6.5l-.87-.5M21 12h-1M4 12H3"/>
      <circle cx="12" cy="12" r="4" strokeLinecap="round"/>
    </svg>
  )
  if (/rest|sleep|avoid|bed|lie/.test(t)) return (
    <svg className="w-5 h-5 text-violet-400 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
    </svg>
  )
  if (/stretch|flexib|mobil|range|extend/.test(t)) return (
    <svg className="w-5 h-5 text-emerald-500 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 4v8m0 0l4-4m-4 4l-4-4"/>
    </svg>
  )
  if (/walk|step|movement|activ|light exercise|movement/.test(t)) return (
    <svg className="w-5 h-5 text-blue-400 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 4a1 1 0 100-2 1 1 0 000 2zM6.5 20l2-5.5 2.5 3 3-8 2.5 5.5M6 10.5l2-1 2 2.5 3-2.5"/>
    </svg>
  )
  if (/strength|strengthen|exercise|train|workout|resistance/.test(t)) return (
    <svg className="w-5 h-5 text-indigo-500 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5h16.5M5.25 13.5v3M18.75 13.5v3M9 13.5V16m6-2.5V16M2.25 13.5h1.5M20.25 13.5h1.5"/>
    </svg>
  )
  if (/massage|therapy|rub|pressure/.test(t)) return (
    <svg className="w-5 h-5 text-pink-400 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l-.001-1.732a.75.75 0 01.724-.737 3.75 3.75 0 00-.722-7.469l-2.088.236"/>
    </svg>
  )
  if (/breath|diaphragm|relax|meditat/.test(t)) return (
    <svg className="w-5 h-5 text-cyan-400 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V4.5a.75.75 0 00-.75-.75H7.5zm0 0C5.354 3.75 3.75 5.354 3.75 7.5c0 2.108 1.49 3.867 3.48 4.273M19.5 7.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-9 4.273A4.501 4.501 0 006.878 19.5H17.12a4.5 4.5 0 00-6.62-7.727z"/>
    </svg>
  )
  if (/posture|sit|stand|ergon/.test(t)) return (
    <svg className="w-5 h-5 text-teal-500 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
    </svg>
  )
  // default checkmark
  return (
    <svg className="w-5 h-5 text-emerald-500 flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  )
}

/* ── Severity arc SVG ──────────────────────────────────── */
function SeverityArc({ avg }) {
  const pct   = (avg - 1) / 9
  const R     = 36
  const circ  = Math.PI * R          // half circle
  const dash  = pct * circ
  const color = heatColor(Math.round(avg))

  return (
    <svg width="96" height="56" viewBox="0 0 96 56" className="overflow-visible">
      {/* Track */}
      <path d="M 8 52 A 40 40 0 0 1 88 52"
        fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round"/>
      {/* Fill */}
      <path d="M 8 52 A 40 40 0 0 1 88 52"
        fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{transition:'stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)'}}/>
      {/* Label */}
      <text x="48" y="42" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{avg.toFixed(1)}</text>
      <text x="48" y="54" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">/ 10</text>
    </svg>
  )
}

/* ── Main export ───────────────────────────────────────── */
export default function ResultsPanel({ recommendation, regionLevels, apiUrl, showCapture, setShowCapture }) {
  const entries = Object.entries(regionLevels)
  const avg     = entries.length ? entries.reduce((s,[,v])=>s+v,0)/entries.length : 0
  const sev     = severityLabel(avg)
  const actions = recommendation.recovery?.actions ?? []
  const precautions = recommendation.recovery?.precautions ?? []

  return (
    <div className="flex flex-col gap-4 anim-in">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">Your assessment</p>

      {/* ── Pain overview ─────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Pain overview</p>
            <div className="flex flex-wrap gap-2">
              {entries.map(([id, lv]) => (
                <div key={id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                  style={{background: heatBg(lv), borderColor: heatColor(lv)+'44', color: heatColor(lv)}}>
                  <span className="w-1.5 h-1.5 rounded-full flex-none" style={{background: heatColor(lv)}}/>
                  {REGION_LABELS[id] || id}
                  <span className="opacity-70 ml-0.5">{lv}</span>
                </div>
              ))}
            </div>
          </div>

          {entries.length > 0 && (
            <div className="flex flex-col items-center flex-none">
              <SeverityArc avg={avg}/>
              <span className={`text-[11px] font-bold mt-0.5 ${sev.color}`}>{sev.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── AI analysis ───────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 shadow-cta">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-none">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1.5">AI analysis</p>
            <p className="text-sm text-white leading-relaxed">{recommendation.why_this_recommendation}</p>
          </div>
        </div>
      </div>

      {/* ── Recovery plan ─────────────────────────────── */}
      {actions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-gray-800">Recovery plan</span>
            </div>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {actions.length} step{actions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {actions.map((action, i) => (
              <div key={i}
                className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-emerald-50/50 rounded-xl transition-colors group">
                <div className="flex-none w-6 h-6 rounded-full bg-emerald-500 text-white text-[11px]
                                font-extrabold flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  {i + 1}
                </div>
                <ActionIcon text={action}/>
                <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{action}</p>
              </div>
            ))}
          </div>

          {precautions.length > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd"/>
                </svg>
                Precautions
              </p>
              <ul className="flex flex-col gap-2">
                {precautions.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-amber-800 leading-relaxed">
                    <span className="flex-none text-amber-500 font-bold">·</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            {!showCapture
              ? <button type="button" onClick={() => setShowCapture(true)}
                  className="w-full py-2.5 rounded-xl border-2 border-indigo-100 bg-indigo-50
                             text-sm font-bold text-indigo-600 hover:bg-indigo-100 transition-colors
                             flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"/>
                  </svg>
                  Record &amp; get feedback
                </button>
              : <ExerciseCapture
                  exerciseName={actions[0]?.slice(0, 40) || 'exercise'}
                  onClose={() => setShowCapture(false)}/>}
          </div>
        </div>
      )}

      {/* ── Referral ──────────────────────────────────── */}
      {recommendation.referral && recommendation.referral.provider_type !== 'none' && (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {/* Amber header stripe */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-5 py-3 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-white">See a specialist</span>
            {recommendation.referral.timing && (
              <span className="ml-auto text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                {recommendation.referral.timing}
              </span>
            )}
          </div>
          <div className="p-5">
            <ReferralBlock referral={recommendation.referral} apiUrl={apiUrl}/>
          </div>
        </div>
      )}

      {recommendation.error_message && (
        <div className="bg-gray-50 rounded-2xl p-5">
          <p className="text-sm text-gray-500 text-center">{recommendation.error_message}</p>
        </div>
      )}
    </div>
  )
}
