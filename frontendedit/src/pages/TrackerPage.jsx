import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import BodyMap from '../components/BodyMap'
import { REGION_LABELS } from '../constants/regions'

/* ─── Storage keys ──────────────────────────────────────────── */
export const SYMPTOM_LOGS_KEY  = 'flexcare_symptom_logs'
export const EXERCISE_LOGS_KEY = 'flexcare_exercise_logs'

/* ─── Storage helpers ───────────────────────────────────────── */
function loadLogs(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function saveLogs(key, arr) {
  try { localStorage.setItem(key, JSON.stringify(arr)) } catch { }
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/* ─── Date helpers ──────────────────────────────────────────── */
const MS_DAY   = 86400000
const MS_WEEK  = 7 * MS_DAY
const MS_MONTH = 30 * MS_DAY
const MS_YEAR  = 365 * MS_DAY

const PERIOD_LABELS = { day: 'Today', week: 'This week', month: 'This month', year: 'This year' }
const PERIOD_MS     = { day: MS_DAY, week: MS_WEEK, month: MS_MONTH, year: MS_YEAR }

function toDateStr(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function formatTime(isoStr) {
  if (!isoStr || !isoStr.includes('T')) return null
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return null
  return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function buildIso(dateStr, timeStr) {
  try {
    const d = new Date(`${dateStr}T${timeStr}:00`)
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  } catch { return new Date().toISOString() }
}

function groupByDay(logs, periodMs) {
  const now = Date.now()
  const cutoff = now - periodMs
  const filtered = logs.filter(l => new Date(l.date).getTime() >= cutoff)

  const map = {}
  filtered.forEach(l => {
    const d = toDateStr(new Date(l.date))
    if (!map[d]) map[d] = []
    map[d].push(l)
  })
  return map
}

/* ─── Sparkline bar chart ───────────────────────────────────── */
function BarChart({ data, color = '#6366f1', label }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-400 mb-2">{label}</p>
      <div className="flex items-end gap-0.5 h-20">
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1 gap-0.5 group relative" title={`${d.dateLabel}: ${d.value}`}>
            <div
              className="w-full rounded-t-sm transition-all duration-300"
              style={{ height: `${Math.max(4, (d.value / max) * 72)}px`, background: color, opacity: 0.8 }}
            />
            <span className="text-[9px] text-gray-400 truncate max-w-full">{d.dateLabel}</span>
            <div className="absolute bottom-full mb-1 hidden group-hover:flex items-center bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap z-10">
              {d.dateLabel}: {d.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── SVG Line chart for pain trend ────────────────────────── */
function LineChart({ data, label }) {
  if (!data || data.length < 2) {
    if (data && data.length === 1) {
      return (
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-2">{label}</p>
          <div className="flex items-center justify-center h-24 text-sm text-gray-400">Only one data point. Log more entries to see the trend.</div>
        </div>
      )
    }
    return null
  }

  const W = 600
  const H = 140
  const PAD = { top: 16, right: 20, bottom: 36, left: 30 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const values = data.map(d => d.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const yMin = Math.max(0, rawMin - 1)
  const yMax = Math.min(10, rawMax + 1)
  const yRange = yMax - yMin || 1

  const xStep = innerW / (data.length - 1)
  const pts = data.map((d, i) => ({
    x: PAD.left + i * xStep,
    y: PAD.top + innerH - ((d.value - yMin) / yRange) * innerH,
    label: d.dateLabel,
    value: d.value,
  }))

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = `M${pts[0].x},${PAD.top + innerH} ` +
    pts.map(p => `L${p.x},${p.y}`).join(' ') +
    ` L${pts[pts.length-1].x},${PAD.top + innerH} Z`

  const firstHalf = values.slice(0, Math.ceil(values.length / 2))
  const secondHalf = values.slice(Math.ceil(values.length / 2))
  const avgFirst  = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length
  const trend = avgSecond < avgFirst - 0.4 ? 'improving' : avgSecond > avgFirst + 0.4 ? 'worsening' : 'stable'

  const lineColor  = trend === 'improving' ? '#10b981' : trend === 'worsening' ? '#ef4444' : '#6366f1'
  const areaColor  = trend === 'improving' ? '#10b98122' : trend === 'worsening' ? '#ef444422' : '#6366f122'
  const dotColor   = lineColor
  const trendLabel = trend === 'improving' ? '↓ Improving' : trend === 'worsening' ? '↑ Worsening' : '→ Stable'
  const trendCls   = trend === 'improving' ? 'text-emerald-600 bg-emerald-50' : trend === 'worsening' ? 'text-red-600 bg-red-50' : 'text-indigo-600 bg-indigo-50'

  const yTicks = [yMin, Math.round((yMin + yMax) / 2), yMax].filter((v, i, a) => a.indexOf(v) === i)

  const [hovered, setHovered] = useState(null)

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-400">{label}</p>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${trendCls}`}>{trendLabel}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 140, overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines */}
        {yTicks.map(tick => {
          const y = PAD.top + innerH - ((tick - yMin) / yRange) * innerH
          return (
            <g key={tick}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 3"/>
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{tick}</text>
            </g>
          )
        })}

        {/* Area fill */}
        <path d={areaPath} fill={areaColor}/>

        {/* Line */}
        <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

        {/* Dots + hover targets */}
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} style={{ cursor: 'default' }}>
            <circle cx={p.x} cy={p.y} r="12" fill="transparent"/>
            <circle cx={p.x} cy={p.y} r={hovered === i ? 5 : 3.5} fill={dotColor} stroke="white" strokeWidth="2"/>
          </g>
        ))}

        {/* Tooltip */}
        {hovered !== null && (() => {
          const p = pts[hovered]
          const bx = Math.min(Math.max(p.x - 40, 4), W - 100)
          const by = p.y - 36
          return (
            <g>
              <rect x={bx} y={by} width="88" height="22" rx="6" fill="#1f2937"/>
              <text x={bx + 44} y={by + 15} textAnchor="middle" fontSize="11" fill="white" fontWeight="600">
                {p.label}: {p.value}/10
              </text>
            </g>
          )
        })()}

        {/* X-axis labels — show subset if many points */}
        {pts.filter((_, i) => {
          if (pts.length <= 8) return true
          if (pts.length <= 14) return i % 2 === 0
          return i % Math.ceil(pts.length / 7) === 0 || i === pts.length - 1
        }).map((p, i) => (
          <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">{p.label}</text>
        ))}
      </svg>
    </div>
  )
}

/* ─── Correlation overlay chart ─────────────────────────────── */
function CorrelationChart({ data }) {
  const [hovered, setHovered] = useState(null)

  if (!data || data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-28 text-gray-400 text-sm text-center gap-1 px-6">
        <svg className="w-8 h-8 text-gray-200 mb-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zm9.75-9.75c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v16.5c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0112.75 19.875V3.375zm-9 12c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 19.875v-4.5z"/>
        </svg>
        Log symptoms and exercises on multiple days to see how they correlate.
      </div>
    )
  }

  const W = 700
  const H = 200
  const PAD = { top: 18, right: 22, bottom: 32, left: 34 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const EX_H = 28
  const PAIN_H = innerH - EX_H - 10

  const painValues = data.filter(d => d.pain != null).map(d => d.pain)
  const maxEx = Math.max(...data.map(d => d.exercises), 1)
  const yMinP = Math.max(0, Math.min(...painValues, 4) - 1)
  const yMaxP = Math.min(10, Math.max(...painValues, 6) + 1)
  const yRangeP = yMaxP - yMinP || 1

  const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW
  const pts = data.map((d, i) => {
    const x = PAD.left + i * xStep
    return {
      x,
      painY: d.pain != null ? PAD.top + PAIN_H - ((d.pain - yMinP) / yRangeP) * PAIN_H : null,
      exH: (d.exercises / maxEx) * EX_H,
      exBaseY: PAD.top + PAIN_H + 10,
      label: d.dateLabel,
      pain: d.pain,
      exercises: d.exercises,
    }
  })

  const painPts = pts.filter(p => p.painY != null)
  const polyline = painPts.map(p => `${p.x},${p.painY}`).join(' ')
  const areaPath = painPts.length >= 2
    ? `M${painPts[0].x},${PAD.top + PAIN_H} ` + painPts.map(p => `L${p.x},${p.painY}`).join(' ') + ` L${painPts[painPts.length-1].x},${PAD.top + PAIN_H} Z`
    : null

  const half = Math.ceil(painPts.length / 2)
  const avgA = painPts.slice(0, half).reduce((s, p) => s + p.pain, 0) / (half || 1)
  const avgB = painPts.slice(half).reduce((s, p) => s + p.pain, 0) / ((painPts.length - half) || 1)
  const trend = painPts.length >= 2 ? (avgB < avgA - 0.4 ? 'imp' : avgB > avgA + 0.4 ? 'wor' : 'sta') : 'sta'
  const lineColor = trend === 'imp' ? '#10b981' : trend === 'wor' ? '#ef4444' : '#6366f1'
  const areaFill  = trend === 'imp' ? '#10b98114' : trend === 'wor' ? '#ef444414' : '#6366f114'

  const yTicks = [...new Set([yMinP, Math.round((yMinP + yMaxP) / 2), yMaxP])]

  const labelStep = pts.length <= 8 ? 1 : pts.length <= 14 ? 2 : Math.ceil(pts.length / 7)
  const barW = Math.min(xStep * 0.55, 14)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200, overflow: 'visible' }} onMouseLeave={() => setHovered(null)}>
        {/* Grid */}
        {yTicks.map(t => {
          const y = PAD.top + PAIN_H - ((t - yMinP) / yRangeP) * PAIN_H
          return (
            <g key={t}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 3"/>
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{t}</text>
            </g>
          )
        })}

        {/* Divider between pain and exercise area */}
        <line x1={PAD.left} y1={PAD.top + PAIN_H + 6} x2={PAD.left + innerW} y2={PAD.top + PAIN_H + 6} stroke="#f3f4f6" strokeWidth="1.5"/>

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={areaFill}/>}

        {/* Pain line */}
        {painPts.length >= 2 && (
          <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        )}

        {/* Exercise bars */}
        {pts.map((p, i) => p.exercises > 0 && (
          <rect key={`ex${i}`}
            x={p.x - barW / 2} y={p.exBaseY + EX_H - p.exH}
            width={barW} height={p.exH}
            rx="2" fill="#10b981" opacity="0.75"
          />
        ))}

        {/* Pain dots + hover regions */}
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} style={{ cursor: 'default' }}>
            <rect x={p.x - xStep / 2} y={PAD.top} width={xStep} height={innerH} fill="transparent"/>
            {p.painY != null && (
              <circle cx={p.x} cy={p.painY} r={hovered === i ? 5 : 3.5} fill={lineColor} stroke="white" strokeWidth="2"/>
            )}
          </g>
        ))}

        {/* Tooltip */}
        {hovered !== null && (() => {
          const p = pts[hovered]
          const lines = [
            p.pain != null ? `Pain: ${p.pain.toFixed(1)}/10` : 'No pain log',
            p.exercises > 0 ? `${p.exercises} exercise session${p.exercises > 1 ? 's' : ''}` : 'Rest day',
          ]
          const tipW = 118
          const tipH = 52
          const tx = Math.min(Math.max(p.x - tipW / 2, 4), W - tipW - 4)
          const ty = Math.max(PAD.top, (p.painY ?? PAD.top + PAIN_H) - tipH - 10)
          return (
            <g>
              <rect x={tx} y={ty} width={tipW} height={tipH} rx="6" fill="#1f2937"/>
              <text x={tx + tipW / 2} y={ty + 14} textAnchor="middle" fontSize="10" fill="#9ca3af">{p.label}</text>
              {lines.map((l, li) => (
                <text key={li} x={tx + tipW / 2} y={ty + 29 + li * 14} textAnchor="middle" fontSize="11" fill="white" fontWeight="600">{l}</text>
              ))}
            </g>
          )
        })()}

        {/* X labels */}
        {pts.filter((_, i) => i % labelStep === 0 || i === pts.length - 1).map((p, i) => (
          <text key={i} x={p.x} y={H - 2} textAnchor="middle" fontSize="9" fill="#9ca3af">{p.label}</text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-0.5 rounded-full" style={{ background: lineColor }}/>
          <span className="text-[11px] text-gray-400 font-medium">Pain level</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400 opacity-80"/>
          <span className="text-[11px] text-gray-400 font-medium">Exercise sessions</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Pain level badge ──────────────────────────────────────── */
function PainBadge({ level }) {
  const colors = [
    '', 'bg-green-100 text-green-700', 'bg-green-100 text-green-700',
    'bg-lime-100 text-lime-700', 'bg-yellow-100 text-yellow-700',
    'bg-yellow-100 text-yellow-700', 'bg-orange-100 text-orange-700',
    'bg-orange-100 text-orange-700', 'bg-red-100 text-red-700',
    'bg-red-100 text-red-700', 'bg-red-200 text-red-800',
  ]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${colors[level] || 'bg-gray-100 text-gray-500'}`}>
      {level}/10
    </span>
  )
}

/* ─── Section header ────────────────────────────────────────── */
function SectionHeader({ icon, title, color, count, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <h2 className="font-bold text-gray-800 text-base">{title}</h2>
        {count > 0 && (
          <span className="text-xs text-gray-400 font-medium">({count} entries)</span>
        )}
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
        </svg>
        Log
      </button>
    </div>
  )
}

/* ─── Mini body map (scaled down for entry cards) ──────────── */
const MINI_SCALE = 0.21
function MiniBodyMap({ regionLevels }) {
  if (!regionLevels || Object.keys(regionLevels).length === 0) return null
  return (
    <div className="flex gap-3 mt-2">
      {['back', 'front'].map(s => (
        <div key={s} style={{ width: Math.round(320 * MINI_SCALE), height: Math.round(480 * MINI_SCALE), overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, width: `${Math.round(100 / MINI_SCALE)}%`, transform: `translateX(-50%) scale(${MINI_SCALE})`, transformOrigin: 'top center', pointerEvents: 'none' }}>
            <BodyMap regionLevels={regionLevels} side={s} gender="male"/>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Log entry card ────────────────────────────────────────── */
function EntryCard({ children, onDelete, tag }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex gap-3 items-start group">
      <div className="flex-1 min-w-0">{children}</div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-red-400 shrink-0 mt-0.5"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
        </svg>
      </button>
    </div>
  )
}

/* ─── Symptom log form ──────────────────────────────────────── */
function SymptomForm({ onSave, onCancel }) {
  const [date, setDate] = useState(toDateStr())
  const [time, setTime] = useState(toTimeStr())
  const [regionLevels, setRegionLevels] = useState({})
  const [painLevel, setPainLevel] = useState(5)
  const [side, setSide] = useState('back')
  const [notes, setNotes] = useState('')

  const selectedIds = Object.keys(regionLevels)

  function handleRegionClick(regionId) {
    setRegionLevels(prev => {
      if (prev[regionId]) {
        const next = { ...prev }
        delete next[regionId]
        return next
      }
      return { ...prev, [regionId]: Number(painLevel) }
    })
  }

  function handlePainChange(val) {
    const n = Number(val)
    setPainLevel(n)
    if (Object.keys(regionLevels).length > 0) {
      setRegionLevels(prev => {
        const next = {}
        Object.keys(prev).forEach(id => { next[id] = n })
        return next
      })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedIds.length === 0) return
    const areas = selectedIds.map(id => REGION_LABELS[id] || id)
    const avgPain = Math.round(Object.values(regionLevels).reduce((s, v) => s + v, 0) / selectedIds.length)
    onSave({ id: uid(), date: buildIso(date, time), areas, regionLevels, painLevel: avgPain, notes: notes.trim(), source: 'manual' })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-indigo-100 shadow-sm px-5 py-4 mb-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-gray-800 text-sm">Log symptoms</p>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Date + time + pain level */}
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Date</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} max={toDateStr()} required
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Time</span>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} required
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Pain: <strong className="text-gray-800">{painLevel}/10</strong></span>
          <input type="range" min="1" max="10" value={painLevel} onChange={e => handlePainChange(e.target.value)}
            className="mt-2 accent-indigo-600"/>
        </label>
      </div>

      {/* Body map */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">
            Tap body areas {selectedIds.length > 0 ? `(${selectedIds.length} selected)` : '(select at least one)'}
          </span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            {['front','back'].map(s => (
              <button key={s} type="button" onClick={() => setSide(s)}
                className={`px-3 py-1 font-medium capitalize transition ${side === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
          <BodyMap regionLevels={regionLevels} onRegionClick={handleRegionClick} side={side} gender="male"/>
        </div>
        {selectedIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedIds.map(id => (
              <button key={id} type="button" onClick={() => handleRegionClick(id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 font-medium hover:bg-red-100 hover:text-red-600 transition">
                {REGION_LABELS[id] || id}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Notes (optional)</span>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Describe when it's worse, what triggers it, any changes…"
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"/>
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={selectedIds.length === 0}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition shadow-sm">
          Save entry
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ─── Exercise log form ─────────────────────────────────────── */
function ExerciseForm({ onSave, onCancel }) {
  const [date, setDate] = useState(toDateStr())
  const [time, setTime] = useState(toTimeStr())
  const [exercise, setExercise] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!exercise.trim()) return
    onSave({
      id: uid(), date: buildIso(date, time), exercise: exercise.trim(),
      sets: sets ? Number(sets) : null,
      reps: reps ? Number(reps) : null,
      duration: duration.trim() || null,
      notes: notes.trim(),
      source: 'manual'
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-emerald-100 shadow-sm px-5 py-4 mb-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-gray-800 text-sm">Log exercise</p>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Date</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} max={toDateStr()} required
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Time</span>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} required
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Exercise name</span>
          <input type="text" value={exercise} onChange={e => setExercise(e.target.value)}
            placeholder="e.g. Walking, Squats" required
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Sets</span>
          <input type="number" min="1" value={sets} onChange={e => setSets(e.target.value)} placeholder="—"
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Reps</span>
          <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} placeholder="—"
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">Duration</span>
          <input type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 20 min"
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">Notes (optional)</span>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="How did it feel? Any pain during? Progress notes…"
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"/>
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-sm">
          Save entry
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function TrackerPage() {
  const [period, setPeriod] = useState('week')
  const [symptomLogs, setSymptomLogs] = useState(() => loadLogs(SYMPTOM_LOGS_KEY))
  const [exerciseLogs, setExerciseLogs] = useState(() => loadLogs(EXERCISE_LOGS_KEY))
  const [showSymptomForm, setShowSymptomForm] = useState(false)
  const [showExerciseForm, setShowExerciseForm] = useState(false)

  const periodMs = PERIOD_MS[period]

  /* ── Filter to period ── */
  const filteredSymptoms = useMemo(() => {
    const cutoff = Date.now() - periodMs
    return symptomLogs.filter(l => new Date(l.date).getTime() >= cutoff)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [symptomLogs, periodMs])

  const filteredExercises = useMemo(() => {
    const cutoff = Date.now() - periodMs
    return exerciseLogs.filter(l => new Date(l.date).getTime() >= cutoff)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [exerciseLogs, periodMs])

  /* ── Chart data ── */
  const symptomChartData = useMemo(() => {
    const byDay = groupByDay(symptomLogs, periodMs)
    const days = Object.keys(byDay).sort()
    if (period === 'day') {
      return days.slice(-1).map(d => ({
        dateLabel: 'Today',
        value: Math.round(byDay[d].reduce((s, l) => s + l.painLevel, 0) / byDay[d].length)
      }))
    }
    const bucket = period === 'year' ? 'month' : 'day'
    if (bucket === 'month') {
      const months = {}
      days.forEach(d => {
        const m = d.slice(0, 7)
        if (!months[m]) months[m] = []
        months[m].push(...byDay[d])
      })
      return Object.keys(months).sort().map(m => ({
        dateLabel: new Date(m + '-01').toLocaleDateString('en-CA', { month: 'short' }),
        value: Math.round(months[m].reduce((s, l) => s + l.painLevel, 0) / months[m].length)
      }))
    }
    return days.map(d => ({
      dateLabel: new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      value: Math.round(byDay[d].reduce((s, l) => s + l.painLevel, 0) / byDay[d].length)
    }))
  }, [symptomLogs, periodMs, period])

  const exerciseChartData = useMemo(() => {
    const byDay = groupByDay(exerciseLogs, periodMs)
    const days = Object.keys(byDay).sort()
    if (period === 'day') {
      return days.slice(-1).map(d => ({ dateLabel: 'Today', value: byDay[d].length }))
    }
    if (period === 'year') {
      const months = {}
      days.forEach(d => {
        const m = d.slice(0, 7)
        months[m] = (months[m] || 0) + byDay[d].length
      })
      return Object.keys(months).sort().map(m => ({
        dateLabel: new Date(m + '-01').toLocaleDateString('en-CA', { month: 'short' }),
        value: months[m]
      }))
    }
    return days.map(d => ({
      dateLabel: new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      value: byDay[d].length
    }))
  }, [exerciseLogs, periodMs, period])

  const correlationChartData = useMemo(() => {
    const sRaw = filteredSymptoms
    const eRaw = filteredExercises
    const sGroups = {}
    sRaw.forEach(l => {
      const d = l.date.slice(0, 10)
      if (!sGroups[d]) sGroups[d] = []
      sGroups[d].push(l.painLevel)
    })
    const eGroups = {}
    eRaw.forEach(l => {
      const d = l.date.slice(0, 10)
      eGroups[d] = (eGroups[d] || 0) + 1
    })
    const allDays = [...new Set([...Object.keys(sGroups), ...Object.keys(eGroups)])].sort()
    if (allDays.length < 2) return []
    if (period === 'year') {
      const months = {}
      allDays.forEach(d => {
        const m = d.slice(0, 7)
        if (!months[m]) months[m] = { pain: [], exercises: 0 }
        if (sGroups[d]) months[m].pain.push(...sGroups[d])
        months[m].exercises += eGroups[d] || 0
      })
      return Object.keys(months).sort().map(m => ({
        dateLabel: new Date(m + '-01').toLocaleDateString('en-CA', { month: 'short' }),
        pain: months[m].pain.length ? Math.round(months[m].pain.reduce((s, v) => s + v, 0) / months[m].pain.length * 10) / 10 : null,
        exercises: months[m].exercises,
      }))
    }
    return allDays.map(d => ({
      dateLabel: new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
      pain: sGroups[d] ? Math.round(sGroups[d].reduce((s, v) => s + v, 0) / sGroups[d].length * 10) / 10 : null,
      exercises: eGroups[d] || 0,
    }))
  }, [filteredSymptoms, filteredExercises, period])

  const correlationInsight = useMemo(() => {
    const sGroups = {}
    filteredSymptoms.forEach(l => {
      const d = l.date.slice(0, 10)
      if (!sGroups[d]) sGroups[d] = []
      sGroups[d].push(l.painLevel)
    })
    const eDates = new Set(filteredExercises.map(l => l.date.slice(0, 10)))
    const avgPainForDays = days => {
      if (!days.length) return null
      const total = days.reduce((s, d) => s + sGroups[d].reduce((a, b) => a + b, 0) / sGroups[d].length, 0)
      return Math.round((total / days.length) * 10) / 10
    }
    const symptomDays = Object.keys(sGroups)
    const exDays   = symptomDays.filter(d => eDates.has(d))
    const restDays = symptomDays.filter(d => !eDates.has(d))
    return {
      exercisePain: avgPainForDays(exDays),
      restPain: avgPainForDays(restDays),
      exDayCount: exDays.length,
      restDayCount: restDays.length,
    }
  }, [filteredSymptoms, filteredExercises])

  /* ── Handlers ── */
  const addSymptom = useCallback((entry) => {
    const updated = [entry, ...symptomLogs]
    saveLogs(SYMPTOM_LOGS_KEY, updated)
    setSymptomLogs(updated)
    setShowSymptomForm(false)
  }, [symptomLogs])

  const deleteSymptom = useCallback((id) => {
    const updated = symptomLogs.filter(l => l.id !== id)
    saveLogs(SYMPTOM_LOGS_KEY, updated)
    setSymptomLogs(updated)
  }, [symptomLogs])

  const addExercise = useCallback((entry) => {
    const updated = [entry, ...exerciseLogs]
    saveLogs(EXERCISE_LOGS_KEY, updated)
    setExerciseLogs(updated)
    setShowExerciseForm(false)
  }, [exerciseLogs])

  const deleteExercise = useCallback((id) => {
    const updated = exerciseLogs.filter(l => l.id !== id)
    saveLogs(EXERCISE_LOGS_KEY, updated)
    setExerciseLogs(updated)
  }, [exerciseLogs])

  /* ── Summary stats ── */
  const avgPain = filteredSymptoms.length
    ? (filteredSymptoms.reduce((s, l) => s + l.painLevel, 0) / filteredSymptoms.length).toFixed(1)
    : null
  const painTrend = useMemo(() => {
    if (filteredSymptoms.length < 2) return null
    const sorted = [...filteredSymptoms].sort((a, b) => new Date(a.date) - new Date(b.date))
    const half = Math.floor(sorted.length / 2)
    const early = sorted.slice(0, half).reduce((s, l) => s + l.painLevel, 0) / half
    const late  = sorted.slice(half).reduce((s, l) => s + l.painLevel, 0) / (sorted.length - half)
    if (late < early - 0.5) return 'improving'
    if (late > early + 0.5) return 'worsening'
    return 'stable'
  }, [filteredSymptoms])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <span className="font-extrabold text-[17px] text-gray-900 tracking-tight">FlexCare</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-semibold text-gray-700">Recovery Tracker</span>
            <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition px-3 py-1.5 rounded-lg hover:bg-indigo-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── Page title + period tabs ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold px-3 py-1 mb-2">
              Personal Health Log
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Recovery Tracker</h1>
            <p className="mt-1 text-gray-500 text-sm">Track your pain, exercises, and progress over time.</p>
          </div>

          {/* Period tabs */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-0.5">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  period === key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── AI Movement Coach banner ── */}
        <Link to="/posture"
          className="group flex items-center justify-between gap-4 bg-gradient-to-r from-indigo-600 to-violet-600
                     text-white rounded-2xl px-6 py-4 mb-8 shadow-sm hover:shadow-md hover:scale-[1.01]
                     transition-all">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">AI Movement Coach</p>
              <p className="text-indigo-200 text-xs mt-0.5">Real-time posture analysis &amp; rep counting using your camera</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-white/90 group-hover:text-white shrink-0">
            Open
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
            </svg>
          </div>
        </Link>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Symptom entries',
              value: filteredSymptoms.length,
              color: 'text-indigo-600',
              bg: 'bg-indigo-50',
              icon: (
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
                </svg>
              )
            },
            {
              label: 'Avg pain level',
              value: avgPain ? `${avgPain}/10` : '—',
              color: avgPain >= 7 ? 'text-red-600' : avgPain >= 4 ? 'text-orange-500' : 'text-emerald-600',
              bg: avgPain >= 7 ? 'bg-red-50' : avgPain >= 4 ? 'bg-orange-50' : 'bg-emerald-50',
              icon: (
                <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
                </svg>
              )
            },
            {
              label: 'Trend',
              value: painTrend === 'improving' ? '↓ Improving' : painTrend === 'worsening' ? '↑ Worsening' : painTrend === 'stable' ? '→ Stable' : '—',
              color: painTrend === 'improving' ? 'text-emerald-600' : painTrend === 'worsening' ? 'text-red-600' : 'text-gray-500',
              bg: painTrend === 'improving' ? 'bg-emerald-50' : painTrend === 'worsening' ? 'bg-red-50' : 'bg-gray-50',
              icon: (
                <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
                </svg>
              )
            },
            {
              label: 'Exercise sessions',
              value: filteredExercises.length,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              icon: (
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"/>
                </svg>
              )
            }
          ].map(({ label, value, color, bg, icon }) => (
            <div key={label} className={`rounded-2xl ${bg} px-5 py-4 flex items-start gap-3`}>
              <div className="mt-0.5">{icon}</div>
              <div>
                <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
                <p className="text-[11px] text-gray-400">{PERIOD_LABELS[period]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Correlation section ── */}
        {(filteredSymptoms.length > 0 || filteredExercises.length > 0) && (
          <div className="mb-6 space-y-4">

            {/* Insight stat cards */}
            {(correlationInsight.exercisePain != null || correlationInsight.restPain != null) && (() => {
              const diff = correlationInsight.exercisePain != null && correlationInsight.restPain != null
                ? correlationInsight.restPain - correlationInsight.exercisePain
                : null
              const verdict = diff == null ? null
                : diff >= 1   ? { label: 'Exercise is helping', cls: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: '✓' }
                : diff >= 0.3 ? { label: 'Slight benefit observed', cls: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: '↓' }
                : diff <= -1  ? { label: 'Pain higher on exercise days', cls: 'text-amber-700 bg-amber-50 border-amber-100', icon: '!' }
                :               { label: 'No clear pattern yet', cls: 'text-gray-600 bg-gray-50 border-gray-200', icon: '→' }
              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 text-center">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Avg pain on exercise days</p>
                    <p className={`text-2xl font-extrabold ${correlationInsight.exercisePain != null ? 'text-indigo-600' : 'text-gray-300'}`}>
                      {correlationInsight.exercisePain != null ? `${correlationInsight.exercisePain}/10` : '—'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{correlationInsight.exDayCount} day{correlationInsight.exDayCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 text-center">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Avg pain on rest days</p>
                    <p className={`text-2xl font-extrabold ${correlationInsight.restPain != null ? 'text-rose-500' : 'text-gray-300'}`}>
                      {correlationInsight.restPain != null ? `${correlationInsight.restPain}/10` : '—'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{correlationInsight.restDayCount} day{correlationInsight.restDayCount !== 1 ? 's' : ''}</p>
                  </div>
                  {verdict && (
                    <div className={`rounded-2xl border shadow-sm px-4 py-3 text-center flex flex-col items-center justify-center gap-1 ${verdict.cls}`}>
                      <p className="text-lg font-extrabold">{verdict.icon}</p>
                      <p className="text-xs font-semibold leading-tight">{verdict.label}</p>
                      {diff != null && <p className="text-[11px] opacity-70">{Math.abs(diff).toFixed(1)} pt difference</p>}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Overlay chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-800">Exercise vs. Pain correlation</p>
                <span className="text-[11px] text-gray-400">{PERIOD_LABELS[period]}</span>
              </div>
              <CorrelationChart data={correlationChartData}/>
            </div>
          </div>
        )}

        {/* ── Charts row ── */}
        {(symptomChartData.length > 0 || exerciseChartData.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {symptomChartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <p className="text-sm font-bold text-gray-800">Pain level trend</p>
                <LineChart data={symptomChartData} label="Average pain level (1–10)"/>
              </div>
            )}
            {exerciseChartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                <p className="text-sm font-bold text-gray-800">Exercise sessions</p>
                <BarChart data={exerciseChartData} color="#10b981" label="Number of exercise sessions per day"/>
              </div>
            )}
          </div>
        )}

        {/* ── Two-col: Symptoms + Exercises ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* ─ Symptoms ─ */}
          <div>
            <SectionHeader
              icon={<svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>}
              title="Symptoms"
              color="bg-indigo-50"
              count={filteredSymptoms.length}
              onAdd={() => { setShowSymptomForm(true); setShowExerciseForm(false) }}
            />

            {showSymptomForm && <SymptomForm onSave={addSymptom} onCancel={() => setShowSymptomForm(false)}/>}

            {filteredSymptoms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No symptom logs for {PERIOD_LABELS[period].toLowerCase()}.</p>
                <button onClick={() => setShowSymptomForm(true)} className="mt-3 text-indigo-600 text-xs font-semibold hover:underline">Log your first entry →</button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSymptoms.map(log => (
                  <EntryCard key={log.id} onDelete={() => deleteSymptom(log.id)}>
                    <div className="flex items-start gap-3">
                      {/* Mini body maps – shown when regionLevels data is available */}
                      {log.regionLevels && Object.keys(log.regionLevels).length > 0 && (
                        <div className="shrink-0 pt-0.5">
                          <MiniBodyMap regionLevels={log.regionLevels}/>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-gray-400 font-medium">{formatDate(log.date)}</span>
                          {formatTime(log.date) && (
                            <span className="text-xs text-gray-400 font-medium tabular-nums">{formatTime(log.date)}</span>
                          )}
                          <PainBadge level={log.painLevel}/>
                          {log.source === 'assessment' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700">AI Assessment</span>
                          )}
                        </div>
                        {log.areas?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {log.areas.map((a, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 font-medium">{a}</span>
                            ))}
                          </div>
                        )}
                        {log.notes && <p className="text-xs text-gray-500 leading-relaxed">{log.notes}</p>}
                      </div>
                    </div>
                  </EntryCard>
                ))}
              </div>
            )}
          </div>

          {/* ─ Exercises ─ */}
          <div>
            <SectionHeader
              icon={<svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"/></svg>}
              title="Exercises"
              color="bg-emerald-50"
              count={filteredExercises.length}
              onAdd={() => { setShowExerciseForm(true); setShowSymptomForm(false) }}
            />

            {showExerciseForm && <ExerciseForm onSave={addExercise} onCancel={() => setShowExerciseForm(false)}/>}

            {filteredExercises.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"/>
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No exercise logs for {PERIOD_LABELS[period].toLowerCase()}.</p>
                <button onClick={() => setShowExerciseForm(true)} className="mt-3 text-emerald-600 text-xs font-semibold hover:underline">Log your first session →</button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExercises.map(log => (
                  <EntryCard key={log.id} onDelete={() => deleteExercise(log.id)}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-gray-800">{log.exercise}</p>
                          {log.source === 'posture' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">AI Tracker</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-gray-400 font-medium">{formatDate(log.date)}</span>
                          {formatTime(log.date) && (
                            <span className="text-xs text-gray-400 font-medium tabular-nums">{formatTime(log.date)}</span>
                          )}
                          {log.sets && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{log.sets} sets</span>}
                          {log.reps && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{log.reps} reps</span>}
                          {log.duration && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{log.duration}</span>}
                          {log.accuracy != null && <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">{log.accuracy}% accuracy</span>}
                        </div>
                        {log.notes && <p className="text-xs text-gray-500 leading-relaxed">{log.notes}</p>}
                      </div>
                    </div>
                  </EntryCard>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Empty overall state ── */}
        {symptomLogs.length === 0 && exerciseLogs.length === 0 && (
          <div className="mt-8 text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/>
              </svg>
            </div>
            <h3 className="font-bold text-gray-700 mb-1">Your tracker is empty</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Start logging your symptoms and exercises. Assessments from the home page will also log symptoms here automatically.
            </p>
            <div className="flex justify-center gap-3 mt-5">
              <button onClick={() => setShowSymptomForm(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm">
                Log symptoms
              </button>
              <button onClick={() => setShowExerciseForm(true)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition shadow-sm">
                Log exercise
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
