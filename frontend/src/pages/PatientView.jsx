import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { accessAPI } from '../api'
import { useAuth } from '../AuthContext'

const colorMap = {
  green:  { bg:'bg-green-50',  border:'border-green-200',  text:'text-green-700',  badge:'bg-green-100 text-green-700 border-green-200' },
  yellow: { bg:'bg-yellow-50', border:'border-yellow-200', text:'text-yellow-700', badge:'bg-yellow-100 text-yellow-700 border-yellow-200' },
  red:    { bg:'bg-red-50',    border:'border-red-200',    text:'text-red-700',    badge:'bg-red-100 text-red-700 border-red-200' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-200',   text:'text-blue-700',   badge:'bg-blue-100 text-blue-700 border-blue-200' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-200',   text:'text-gray-700',   badge:'bg-gray-100 text-gray-700 border-gray-200' },
}

function ParamRow({ param }) {
  const col  = colorMap[param.color] || colorMap.gray
  const icon = param.status === 'normal' ? '✅' : param.status === 'borderline' ? '⚠️' : param.status === 'low' ? '🔵' : '🔴'
  return (
    <div className={`rounded-xl border p-3 mb-2 ${col.bg} ${col.border}`}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="font-semibold text-gray-900 text-sm">{param.label}</p>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${col.badge}`}>
          {param.range_name}
        </span>
      </div>
      <p className="text-lg font-bold text-gray-800">{param.value} <span className="text-xs font-normal text-gray-500">{param.unit}</span></p>
      <p className={`text-xs mt-1 ${col.text}`}>{icon} {param.explanation}</p>
    </div>
  )
}

function ReportCard({ report }) {
  const [open, setOpen] = useState(false)
  const analysis        = report.analysis_result || {}
  const abnormalCount   = Object.keys(report.abnormal_values || {}).length
  const hasResults      = analysis.results && Object.keys(analysis.results).length > 0
  const conditionSummary = analysis.condition_summary || []

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${abnormalCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            📄
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{report.filename}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(report.uploaded_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
              {analysis.parameters_found ? ` · ${analysis.parameters_found} parameters` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {abnormalCount > 0
            ? <span className="text-xs bg-red-100 text-red-600 border border-red-200 font-semibold px-2.5 py-1 rounded-full">⚠️ {abnormalCount} Abnormal</span>
            : <span className="text-xs bg-green-100 text-green-700 border border-green-200 font-semibold px-2.5 py-1 rounded-full">✅ Normal</span>
          }
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4 animate-fade-up">
          {/* Condition Summary */}
          {conditionSummary.length > 0 && (
            <div>
              <p className="font-semibold text-sm text-gray-800 mb-2">📋 Condition Summary</p>
              <div className="grid md:grid-cols-2 gap-2">
                {conditionSummary.map((c, i) => {
                  const col = colorMap[c.color] || colorMap.gray
                  return (
                    <div key={i} className={`rounded-xl border p-3 ${col.bg} ${col.border}`}>
                      <p className="font-bold text-sm text-gray-900">{c.icon} {c.condition}</p>
                      <p className={`text-xs font-semibold mt-1 ${col.text}`}>{c.verdict}</p>
                      <p className="text-xs text-gray-600 mt-1">{c.detail}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* All parameters */}
          {hasResults && (
            <div>
              <p className="font-semibold text-sm text-gray-800 mb-2">📊 All Parameters</p>
              {Object.values(analysis.results).map((param, i) => (
                <ParamRow key={i} param={param} />
              ))}
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions?.length > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="font-semibold text-sm text-green-800 mb-2">💡 Suggestions for Patient</p>
              <ul className="space-y-1.5">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-green-900 flex gap-2">
                    <span className="flex-shrink-0">→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
            ⚠️ This analysis is for reference only. Always conduct your own clinical assessment.
          </div>
        </div>
      )}
    </div>
  )
}

export default function PatientView() {
  const { patientId } = useParams()
  const { user }      = useAuth()
  const navigate      = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [activeTab, setTab]   = useState('overview')

  useEffect(() => {
    if (!user || !patientId) return
    accessAPI.patientData(patientId, user.user_id)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Could not load patient data. Access may not be granted.'))
      .finally(() => setLoading(false))
  }, [patientId, user])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-up">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-up">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="font-display text-2xl text-red-800 mb-2">Access Denied</h2>
          <p className="text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/app/access')}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm">
            Go to Access Requests →
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { patient, profile, risk_history, reports } = data
  const latestRisk = risk_history?.[0]

  const bmi = profile?.weight && profile?.height
    ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1)
    : null

  const tabs = [
    { id: 'overview',  label: '👤 Overview' },
    { id: 'risks',     label: '🧠 Risk Analysis', badge: risk_history?.length || 0 },
    { id: 'reports',   label: '📄 Lab Reports',   badge: reports?.length || 0 },
    { id: 'lifestyle', label: '🌿 Lifestyle' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-up">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 text-white rounded-3xl p-7 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 text-green-200 hover:text-white text-sm flex items-center gap-1 transition-colors">
          ← Back
        </button>
        <button onClick={() => navigate(`/app/patient/${patientId}/life-print`)}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all border border-white/30">
          🖨️ Life Print
        </button>
        <div className="flex items-center gap-4 mt-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-bold border-2 border-white/30 flex-shrink-0">
            {patient.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl">{patient.name}</h1>
            <p className="text-green-200 text-sm">{patient.email}</p>
            <p className="text-green-300 text-xs mt-0.5">
              {profile?.age ? `${profile.age} yrs` : 'Age unknown'}
              {profile?.gender ? ` · ${profile.gender}` : ''}
              {bmi ? ` · BMI ${bmi}` : ''}
            </p>
          </div>
        </div>
        <div className="mt-4 bg-white/10 rounded-xl px-4 py-2 text-xs text-green-100 flex items-center gap-2">
          🔒 Read-only access granted by patient. You cannot edit their data.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === t.id ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}>
            {t.label}
            {t.badge > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-scale-in">
          {/* Risk cards */}
          {latestRisk && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label:'Heart',       val: latestRisk.heart_risk,        color:'text-red-600',    bg:'bg-red-50 border-red-100'    },
                { label:'Diabetes',    val: latestRisk.diabetes_risk,     color:'text-amber-600',  bg:'bg-amber-50 border-amber-100' },
                { label:'Stroke',      val: latestRisk.stroke_risk,       color:'text-blue-600',   bg:'bg-blue-50 border-blue-100'  },
                { label:'Hypertension',val: latestRisk.hypertension_risk, color:'text-purple-600', bg:'bg-purple-50 border-purple-100'},
              ].map(r => (
                <div key={r.label} className={`rounded-2xl border p-4 text-center ${r.bg}`}>
                  <p className={`text-2xl font-bold ${r.color}`}>{r.val?.toFixed(0)}%</p>
                  <p className="text-xs text-gray-500 mt-1">{r.label}</p>
                  <div className="h-1.5 bg-white/60 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full ${r.color.replace('text','bg')} rounded-full`} style={{ width:`${r.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Basic health details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Health Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { label:'Age',            val: profile?.age    ? `${profile.age} years`  : null },
                { label:'Gender',         val: profile?.gender },
                { label:'Weight',         val: profile?.weight ? `${profile.weight} kg`  : null },
                { label:'Height',         val: profile?.height ? `${profile.height} cm`  : null },
                { label:'BMI',            val: bmi },
                { label:'Blood Pressure', val: profile?.blood_pressure_sys ? `${profile.blood_pressure_sys}/${profile.blood_pressure_dia} mmHg` : null },
                { label:'Blood Glucose',  val: profile?.blood_glucose  ? `${profile.blood_glucose} mg/dL`  : null },
                { label:'Cholesterol',    val: profile?.cholesterol    ? `${profile.cholesterol} mg/dL`    : null },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                  <p className={`text-sm font-semibold mt-0.5 capitalize ${item.val ? 'text-gray-800' : 'text-gray-300'}`}>
                    {item.val || '—'}
                  </p>
                </div>
              ))}
            </div>
            {profile?.medical_history && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-600 font-semibold mb-1">Medical History</p>
                <p className="text-sm text-gray-700">{profile.medical_history}</p>
              </div>
            )}
            {profile?.family_history && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-600 font-semibold mb-1">Family History</p>
                <p className="text-sm text-gray-700">{profile.family_history}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RISKS TAB ── */}
      {activeTab === 'risks' && (
        <div className="space-y-4 animate-scale-in">
          {risk_history?.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <div className="text-4xl mb-2">🧠</div>
              <p className="font-semibold text-gray-600">No risk analysis done yet</p>
              <p className="text-sm mt-1">Patient has not run AI risk analysis yet</p>
            </div>
          ) : (
            risk_history.map((h, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold text-gray-900 text-sm">Risk Analysis #{risk_history.length - i}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(h.calculated_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label:'Heart Disease', val: h.heart_risk,        color:'bg-red-400'    },
                    { label:'Diabetes',      val: h.diabetes_risk,     color:'bg-amber-400'  },
                    { label:'Stroke',        val: h.stroke_risk,       color:'bg-blue-400'   },
                    { label:'Hypertension',  val: h.hypertension_risk, color:'bg-purple-400' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-3">
                      <p className="text-sm text-gray-600 w-28 flex-shrink-0">{r.label}</p>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-2 ${r.color} rounded-full`} style={{ width:`${r.val}%` }} />
                      </div>
                      <p className={`text-sm font-bold w-10 text-right ${r.val >= 60 ? 'text-red-600' : r.val >= 35 ? 'text-amber-600' : 'text-green-600'}`}>
                        {r.val?.toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {activeTab === 'reports' && (
        <div className="space-y-3 animate-scale-in">
          {reports?.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <div className="text-4xl mb-2">📄</div>
              <p className="font-semibold text-gray-600">No lab reports uploaded yet</p>
              <p className="text-sm mt-1">Patient has not uploaded any lab reports yet</p>
            </div>
          ) : (
            reports.map(r => <ReportCard key={r.id} report={r} />)
          )}
        </div>
      )}

      {/* ── LIFESTYLE TAB ── */}
      {activeTab === 'lifestyle' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-scale-in">
          <h3 className="font-semibold text-gray-900 mb-4">Lifestyle & Habits</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Exercise Frequency', val: profile?.exercise_freq, icon:'🏃' },
              { label:'Diet Type',          val: profile?.diet_type?.replace('-',' '), icon:'🥗' },
              { label:'Smoking',            val: profile?.smoking ? 'Yes ⚠️' : 'No ✅', icon:'🚬' },
              { label:'Alcohol',            val: profile?.alcohol ? 'Yes' : 'No ✅', icon:'🍺' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xl mb-2">{item.icon}</p>
                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                <p className={`text-sm font-semibold mt-0.5 capitalize ${item.val ? 'text-gray-800' : 'text-gray-300'}`}>
                  {item.val || 'Not set'}
                </p>
              </div>
            ))}
          </div>
          {profile?.symptoms && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs text-red-600 font-semibold mb-1">Reported Symptoms</p>
              <p className="text-sm text-gray-700">{profile.symptoms}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
