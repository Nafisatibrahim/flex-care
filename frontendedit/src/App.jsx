import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import BodyMap from './components/BodyMap'
import ExerciseCapture from './components/ExerciseCapture'
import ReferralBlock from './components/ReferralBlock'
import ResultsPanel from './components/ResultsPanel'
import UserProfileForm, { FLEXCARE_SESSION_KEY } from './components/UserProfileForm'
import { REGION_LABELS, PAIN_LEVEL_MIN, PAIN_LEVEL_MAX } from './constants/regions'
import { buildIntakePayload } from './utils/intake'

const DEFAULT_PAIN_LEVEL = 5
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const GITHUB_URL = 'https://github.com/your-org/flexcare'

const HEAT = ['#22c55e','#86efac','#fde68a','#fbbf24','#fb923c','#f97316','#ef4444','#dc2626','#b91c1c','#7f1d1d']
function heatColor(v) { return HEAT[Math.max(0, Math.min(9, v - 1))] }
function heatBg(v)    { return heatColor(v) + '22' }

/* ─── Shared UI ────────────────────────────────────────────── */

function SegTabs({ options, value, onChange }) {
  return (
    <div className="flex bg-gray-100 rounded-xl p-[3px] gap-[2px]">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`flex-1 py-2 rounded-[10px] text-sm font-semibold transition-all leading-none
            ${value === o.value
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-400 hover:text-gray-600'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Dots() {
  return (
    <span className="flex items-center gap-[5px] text-white">
      <span className="dot"/><span className="dot"/><span className="dot"/>
    </span>
  )
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100
                     text-indigo-600 text-xs font-semibold px-3 py-1">
      {children}
    </span>
  )
}

/* ─── Nav ────────────────────────────────────────────────────── */

function Navbar({ onTryClick }) {
  const [open, setOpen] = useState(false)
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0()

  const links = [
    { label: 'Home',            href: '#home' },
    { label: 'How it works',    href: '#how' },
    { label: 'Try it',          onClick: onTryClick },
    { label: 'Tracker', to: '/posture' },
    { label: 'Game',            href: '/game/index.html', external: true },
    { label: 'GitHub',          href: GITHUB_URL, external: true },
    { label: 'Contact',         href: '#contact' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-indigo-600 to-violet-600
                          flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <span className="font-extrabold text-[17px] text-gray-900 tracking-tight">FlexCare</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {links.map(l => (
            l.onClick
              ? <button key={l.label} onClick={l.onClick}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50 whitespace-nowrap">
                  {l.label}
                </button>
              : l.to
              ? <Link key={l.label} to={l.to}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50 flex items-center gap-1 whitespace-nowrap">
                  <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                  </svg>
                  {l.label}
                </Link>
              : <a key={l.label} href={l.href} target={l.external ? '_blank' : undefined}
                   rel={l.external ? 'noopener noreferrer' : undefined}
                   className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50 flex items-center gap-1 whitespace-nowrap">
                  {l.label}
                  {l.external && (
                    <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  )}
                </a>
          ))}
        </nav>

        {/* Auth + CTA */}
        <div className="hidden lg:flex items-center gap-2">
          {isLoading ? null : isAuthenticated ? (
            <div className="flex items-center gap-2">
              {user?.picture
                ? <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-indigo-200"/>
                : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                    {(user?.name || user?.email || '?')[0].toUpperCase()}
                  </div>}
              <span className="text-sm text-gray-700 font-medium max-w-[120px] truncate">{user?.name || user?.email}</span>
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg transition-colors">
                Log out
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => loginWithRedirect()}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors whitespace-nowrap">
                Log in
              </button>
              <button
                onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors shadow-sm whitespace-nowrap">
                Sign up free
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          onClick={() => setOpen(v => !v)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-6 py-3 flex flex-col gap-1">
          {links.map(l => (
            l.onClick
              ? <button key={l.label} onClick={() => { l.onClick(); setOpen(false) }}
                  className="text-left px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
                  {l.label}
                </button>
              : l.to
              ? <Link key={l.label} to={l.to} onClick={() => setOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-indigo-600 rounded-lg hover:bg-indigo-50">
                  {l.label}
                </Link>
              : <a key={l.label} href={l.href} target={l.external ? '_blank' : undefined}
                   rel={l.external ? 'noopener noreferrer' : undefined}
                   onClick={() => setOpen(false)}
                   className="px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
                  {l.label}
                </a>
          ))}
          <div className="border-t border-gray-100 pt-2 mt-1 flex flex-col gap-1">
            {!isLoading && (isAuthenticated ? (
              <div className="flex items-center gap-2 px-3 py-2">
                {user?.picture
                  ? <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full"/>
                  : <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                      {(user?.name || user?.email || '?')[0].toUpperCase()}
                    </div>}
                <span className="text-sm text-gray-700 font-medium flex-1 truncate">{user?.name || user?.email}</span>
                <button
                  onClick={() => { logout({ logoutParams: { returnTo: window.location.origin } }); setOpen(false) }}
                  className="text-xs text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-50">
                  Log out
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => { loginWithRedirect(); setOpen(false) }}
                  className="text-left px-3 py-2 text-sm font-medium text-indigo-600 rounded-lg hover:bg-indigo-50">
                  Log in
                </button>
                <button onClick={() => { loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } }); setOpen(false) }}
                  className="text-left px-3 py-2 text-sm font-semibold text-indigo-700 rounded-lg hover:bg-indigo-50">
                  Sign up free
                </button>
              </>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

/* ─── Hero ───────────────────────────────────────────────────── */

function Hero({ onTryClick }) {
  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700">
      {/* Decorative blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"/>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none"/>

      <div className="max-w-7xl mx-auto px-6 py-24 md:py-36 text-center relative z-10">
        <Badge>AI-Powered · Free · Open Source</Badge>
        <h1 className="mt-6 text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
          Smarter recovery<br/>
          <span className="text-indigo-200">starts here</span>
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-lg md:text-xl text-indigo-200 leading-relaxed">
          FlexCare uses AI to analyse your musculoskeletal pain, build a personalised recovery plan,
          and tell you when to see a specialist — in seconds.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={onTryClick}
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold
                       px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02]
                       transition-all text-base">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Get your assessment
          </button>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold
                       px-7 py-3.5 rounded-2xl transition-all text-base border border-white/20">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
            </svg>
            View on GitHub
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 max-w-md mx-auto">
          {[
            { n: '30s', label: 'avg. assessment' },
            { n: '40+', label: 'muscle regions' },
            { n: '100%', label: 'free & open source' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-white">{s.n}</p>
              <p className="text-xs text-indigo-300 mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="white" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,60 L0,60 Z"/>
        </svg>
      </div>
    </section>
  )
}

/* ─── How it works ───────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      icon: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>
      ),
      title: 'Select your pain areas',
      body: 'Tap any muscle group on the interactive 3D body map. Add as many regions as you need — front or back, male or female.',
    },
    {
      icon: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
      ),
      title: 'Describe your symptoms',
      body: 'Rate your pain severity on a 1–10 scale and optionally add details like duration, triggers, or a free-text description.',
    },
    {
      icon: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      ),
      title: 'Get your plan instantly',
      body: 'The AI engine returns a personalised recovery plan — exercises, precautions, and a specialist referral recommendation if needed.',
    },
  ]

  return (
    <section id="how" className="bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <Badge>How it works</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            From pain to plan in three steps
          </h2>
          <p className="mt-3 text-gray-500 text-lg max-w-xl mx-auto">
            No account required. No jargon. Just clear, actionable guidance.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="relative bg-gray-50 rounded-2xl p-7 border border-gray-100">
              <div className="w-11 h-11 rounded-[14px] bg-indigo-50 flex items-center justify-center mb-5">
                {s.icon}
              </div>
              <span className="absolute top-6 right-6 text-5xl font-black text-gray-100 select-none leading-none">
                {i + 1}
              </span>
              <h3 className="text-[17px] font-bold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── App Tool ───────────────────────────────────────────────── */

function AppTool({ toolRef }) {
  const [regionLevels, setRegionLevels] = useState({})
  const [view, setView]     = useState('back')
  const [gender, setGender] = useState('male')
  const [freeText, setFreeText]   = useState('')
  const [duration, setDuration]   = useState('')
  const [triggers, setTriggers]   = useState('')
  const [recommendation, setRecommendation] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showCapture, setShowCapture] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const add    = id  => setRegionLevels(p => ({ ...p, [id]: p[id] ?? DEFAULT_PAIN_LEVEL }))
  const remove = id  => setRegionLevels(p => { const n = { ...p }; delete n[id]; return n })
  const setLv  = (id, v) => setRegionLevels(p => ({ ...p, [id]: Math.max(PAIN_LEVEL_MIN, Math.min(PAIN_LEVEL_MAX, v)) }))

  const submit = async () => {
    const session_id = localStorage.getItem(FLEXCARE_SESSION_KEY) || undefined
    const payload = buildIntakePayload(regionLevels, { free_text: freeText, duration, triggers, session_id })
    setError(null); setRecommendation(null); setLoading(true)
    try {
      const res = await fetch(`${API_URL}/assess`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.text()) || `Error ${res.status}`)
      setRecommendation(await res.json())
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again or speak to a healthcare professional.')
    } finally { setLoading(false) }
  }

  const entries = Object.entries(regionLevels)
  const hasInput = entries.length > 0
  const hasMeta  = freeText || duration || triggers

  return (
    <section id="app" ref={toolRef} className="bg-gray-50 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <Badge>Interactive tool</Badge>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Start your assessment
          </h2>
          <p className="mt-2 text-gray-500 text-base">
            Select muscle regions, rate your pain, and get a personalised recovery plan.
          </p>
          <button
            onClick={() => setShowProfile(v => !v)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
            </svg>
            {showProfile ? 'Hide health profile' : 'Add health profile'}
            <span className="text-xs text-indigo-400 font-normal">(personalises your results)</span>
          </button>
        </div>

        {/* Health profile collapsible */}
        {showProfile && (
          <div className="max-w-2xl mx-auto mb-8">
            <UserProfileForm onClose={() => setShowProfile(false)} />
          </div>
        )}

        {/* Two-col layout on desktop */}
        <div className="grid grid-cols-1 gap-8 items-start">

          {/* ─ Left: body map + pain areas + details ─ */}
          <div className="flex flex-col gap-4">

            {/* Body map card */}
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="px-6 pt-5 pb-4">
                <p className="text-base font-bold text-gray-800 mb-4">Where does it hurt?</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <SegTabs options={[{label:'Back',value:'back'},{label:'Front',value:'front'}]}
                      value={view} onChange={setView}/>
                  </div>
                  <div className="flex-1">
                    <SegTabs options={[{label:'Male',value:'male'},{label:'Female',value:'female'}]}
                      value={gender} onChange={setGender}/>
                  </div>
                </div>
              </div>
              <div className="px-6">
                <BodyMap onRegionClick={add} regionLevels={regionLevels} side={view} gender={gender}/>
              </div>
              <p className="text-center text-xs text-gray-400 pb-4 pt-1">Tap a muscle region to add it</p>
            </div>

            {/* Pain area cards */}
            {entries.length > 0 && (
              <div className="anim-in">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">
                  Pain areas · {entries.length}
                </p>
                <div className="flex flex-col gap-2">
                  {entries.map(([id, lv]) => (
                    <div key={id} className="bg-white rounded-2xl shadow-card px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-none" style={{background: heatColor(lv)}}/>
                          <span className="text-sm font-semibold text-gray-800">{REGION_LABELS[id] || id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{background: heatBg(lv), color: heatColor(lv)}}>{lv}/10</span>
                          <button type="button" onClick={() => remove(id)}
                            className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center
                                       text-gray-400 hover:bg-red-50 hover:text-red-400 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <input type="range" min={PAIN_LEVEL_MIN} max={PAIN_LEVEL_MAX} value={lv}
                        onChange={e => setLv(id, +e.target.value)}/>
                      <div className="flex justify-between text-xs text-gray-400 mt-1 font-medium">
                        <span>Mild</span><span>Severe</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details accordion */}
            <div>
              <button type="button" onClick={() => setShowDetails(v => !v)}
                className="w-full bg-white rounded-2xl shadow-card px-5 py-4 flex items-center
                           justify-between active:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center">
                    <svg className="w-[15px] h-[15px] text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">Add more details</span>
                  {hasMeta && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"/>}
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {showDetails && (
                <div className="bg-white rounded-b-2xl shadow-card -mt-2 pt-4 px-5 pb-5 flex flex-col gap-3 anim-in">
                  {[
                    {label:'How long has it lasted?', key:'d', val:duration, set:setDuration, placeholder:'e.g. 3 days, 2 weeks'},
                    {label:'What triggers it?',       key:'t', val:triggers, set:setTriggers, placeholder:'e.g. sitting, lifting, running'},
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{f.label}</label>
                      <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm
                                   text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                                   focus:ring-indigo-300 focus:border-transparent transition"/>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Describe your symptoms</label>
                    <textarea rows={3} value={freeText} onChange={e => setFreeText(e.target.value)}
                      placeholder="Anything else about your pain…"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm
                                 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                                 focus:ring-indigo-300 focus:border-transparent resize-none transition"/>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="button" onClick={submit} disabled={!hasInput || loading}
              className={`w-full h-14 rounded-2xl text-base font-bold tracking-wide flex items-center
                         justify-center gap-2 transition-all duration-150
                         ${hasInput && !loading
                           ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-cta hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]'
                           : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              {loading
                ? <><Dots/><span className="ml-1">Analysing…</span></>
                : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    {recommendation ? 'Reassess' : 'Get my assessment'}
                  </>}
            </button>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 anim-in">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-none">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                  </div>
                  <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* ─ Right: results ─ */}
          <div className="flex flex-col gap-4">
            {!recommendation && (
              <div className="bg-white rounded-2xl shadow-card flex flex-col items-center justify-center
                              py-24 px-8 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-700">Your assessment will appear here</p>
                  <p className="text-sm text-gray-400 mt-1">Select at least one pain area and tap "Get my assessment"</p>
                </div>
              </div>
            )}

            {recommendation && (
              <ResultsPanel
                recommendation={recommendation}
                regionLevels={regionLevels}
                apiUrl={API_URL}
                showCapture={showCapture}
                setShowCapture={setShowCapture}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Footer ─────────────────────────────────────────────────── */

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer id="contact" className="bg-gray-900 text-gray-400 py-14">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span className="text-white font-extrabold text-base tracking-tight">FlexCare</span>
            </div>
            <p className="text-sm leading-relaxed">
              AI-powered musculoskeletal recovery assistant. Built for athletes, physios, and anyone in pain.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Resources</p>
            <ul className="flex flex-col gap-2 text-sm">
              {[
                { label: 'GitHub Repository', href: GITHUB_URL, external: true },
                { label: 'Report an issue', href: `${GITHUB_URL}/issues`, external: true },
                { label: 'How it works', href: '#how' },
                { label: 'Try the tool', href: '#app' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} target={l.external ? '_blank' : undefined}
                     rel={l.external ? 'noopener noreferrer' : undefined}
                     className="hover:text-white transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Contact</p>
            <p className="text-sm leading-relaxed mb-3">
              Have a question or want to contribute? Open an issue on GitHub or reach out directly.
            </p>
            <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500
                         text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              Open an issue
            </a>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm">© {year} FlexCare. Open-source under MIT licence.</p>
          <p className="text-xs text-gray-600">
            Not a substitute for professional medical advice. Always consult a qualified healthcare provider.
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ─── Root ───────────────────────────────────────────────────── */

export default function App() {
  const toolRef = useRef(null)

  const scrollToTool = () => {
    toolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar onTryClick={scrollToTool}/>
      <Hero onTryClick={scrollToTool}/>
      <HowItWorks/>
      <AppTool toolRef={toolRef}/>
      <Footer/>
    </div>
  )
}
