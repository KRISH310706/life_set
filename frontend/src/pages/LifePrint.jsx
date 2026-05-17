/**
 * LifeSet — Life Print
 * Printable two-page clinical handoff summary.
 * Routes: /app/life-print  and  /app/patient/:patientId/life-print
 */
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { lifePrintAPI } from '../api'

// ── Reusable Components ───────────────────────────────────────────────────────
const PILL_STYLES = {
  green:  'bg-green-100 text-green-800 border border-green-200',
  blue:   'bg-blue-100 text-blue-800 border border-blue-200',
  amber:  'bg-amber-100 text-amber-800 border border-amber-200',
  red:    'bg-red-100 text-red-800 border border-red-200',
  gray:   'bg-gray-100 text-gray-700 border border-gray-200',
}
function Pill({ children, tone = 'gray' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${PILL_STYLES[tone] || PILL_STYLES.gray}`}>
      {children}
    </span>
  )
}

function SectionTitle({ icon, children }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 pb-1 border-b border-gray-200">
      {icon && <span>{icon}</span>}
      {children}
    </h3>
  )
}

function RiskBar({ label, value, color }) {
  const COLORS = {
    green:  { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50'  },
    yellow: { bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
    orange: { bar: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
    red:    { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50'    },
  }
  const v = Math.min(100, Math.max(0, value || 0))
  const c = v >= 70 ? COLORS.red : v >= 45 ? COLORS.orange : v >= 25 ? COLORS.yellow : COLORS.green
  return (
    <div className={`rounded-lg p-2.5 ${c.bg}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className={`text-xs font-bold ${c.text}`}>{v}%</span>
      </div>
      <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-200">
        <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

function SnapCard({ label, value, unit, color = 'gray' }) {
  const colors = {
    green:  'bg-green-50 border-green-200 text-green-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    gray:   'bg-gray-50 border-gray-200 text-gray-700',
  }
  return (
    <div className={`rounded-xl border p-3 text-center ${colors[color] || colors.gray}`}>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold leading-none">{value ?? '—'}</p>
      {unit && <p className="text-xs mt-0.5 opacity-70">{unit}</p>}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(val, fallback = 'Not recorded') {
  return val !== undefined && val !== null && val !== '' ? val : fallback
}
function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return iso }
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return iso }
}
function calcBMI(weight, height) {
  if (!weight || !height) return null
  return (weight / ((height / 100) ** 2)).toFixed(1)
}
function bmiColor(bmi) {
  if (!bmi) return 'gray'
  const b = parseFloat(bmi)
  if (b < 18.5) return 'blue'
  if (b < 25)   return 'green'
  if (b < 30)   return 'amber'
  return 'red'
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LifePrint() {
  const { patientId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const printRef = useRef(null)

  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [visitNote, setVisitNote] = useState('')

  const isDoctor   = !!patientId
  const subjectId  = patientId ? parseInt(patientId) : user?.user_id
  const role       = isDoctor ? 'doctor' : 'patient'

  useEffect(() => {
    if (!subjectId || !user?.user_id) return
    setLoading(true)
    setError(null)
    lifePrintAPI.summary(subjectId, user.user_id, role)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(e => {
        setError(e.response?.data?.detail || 'Failed to load Life Print data.')
        setLoading(false)
      })
  }, [subjectId, user?.user_id, role])

  useEffect(() => {
    if (data?.subject?.name) {
      document.title = `Life Print — ${data.subject.name}`
    }
    return () => { document.title = 'LifeSet' }
  }, [data])

  const handlePrint = () => window.print()

  const handleDownloadPDF = async () => {
    const el = printRef.current
    if (!el) return
    try {
      const html2pdf = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')).default
      html2pdf().set({
        margin: [8, 8, 8, 8],
        filename: `LifePrint_${data?.subject?.name?.replace(/\s+/g,'_') || 'patient'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).from(el).save()
    } catch {
      // Fallback to print
      window.print()
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 font-medium">Generating Life Print…</p>
          <p className="text-xs text-gray-400">Assembling clinical summary from all health data</p>
        </div>
      </div>
    )
  }

  // ── Error panel ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center shadow-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-red-700 mb-2">Unable to Load Life Print</h2>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
            ← Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { subject, profile, risks, recommendations, risk_history, reports, alerts, access_summary, habits, summary_lines, generated_at } = data
  const bmi = calcBMI(profile?.weight, profile?.height)
  const recs = recommendations || {}

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Action Controls (hidden in print) ──────────────────────────────── */}
      <div className="no-print sticky top-0 z-50 bg-white border-b border-green-100 shadow-sm px-6 py-3 flex flex-wrap items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-all">
          ← Back
        </button>
        <div className="flex-1 min-w-[180px]">
          <input
            value={visitNote}
            onChange={e => setVisitNote(e.target.value)}
            placeholder="Reason for visit (optional, appears in print)"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all">
            🖨️ Print / Save as PDF
          </button>
          <button onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all">
            ⬇️ Download PDF
          </button>
        </div>
      </div>

      {/* ── Printable Content ──────────────────────────────────────────────── */}
      <div ref={printRef} className="max-w-4xl mx-auto py-8 px-4 print:px-0 print:py-0">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PAGE 1                                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden page-break-after print:shadow-none print:rounded-none">

          {/* Hero Header */}
          <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-500 px-8 py-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                    {subject.name?.[0]?.toUpperCase() || 'P'}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold leading-tight">{subject.name}</h1>
                    <p className="text-green-200 text-sm">{subject.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {subject.age   && <Pill tone="green">{subject.age} yrs</Pill>}
                  {subject.gender && <Pill tone="green">{subject.gender}</Pill>}
                  {subject.is_verified === 1 && <Pill tone="green">✓ Verified</Pill>}
                  <Pill tone={isDoctor ? 'blue' : 'green'}>{isDoctor ? '🩺 Doctor View' : '🏥 Patient View'}</Pill>
                </div>
              </div>
              <div className="text-right text-sm text-green-100 space-y-0.5">
                <p className="font-bold text-white text-base">LifeSet Life Print</p>
                <p>Generated: {fmtDateTime(generated_at)}</p>
                {subject.phone && <p>📱 {subject.phone}</p>}
                {visitNote && <p className="mt-2 text-yellow-200 font-semibold italic">Visit: {visitNote}</p>}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Clinical Snapshot */}
            <section>
              <SectionTitle icon="📊">Clinical Snapshot</SectionTitle>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <SnapCard label="Age"        value={fmt(subject.age || profile?.age, '—')}    unit="years"   color="blue"  />
                <SnapCard label="Gender"     value={fmt(subject.gender || profile?.gender, '—')} color="blue" />
                <SnapCard label="Height"     value={fmt(profile?.height, '—')}                 unit="cm"      color="gray"  />
                <SnapCard label="Weight"     value={fmt(profile?.weight, '—')}                 unit="kg"      color="gray"  />
                <SnapCard label="BMI"        value={bmi || '—'}                                color={bmiColor(bmi)} />
                <SnapCard label="BP"
                  value={profile?.blood_pressure_sys && profile?.blood_pressure_dia
                    ? `${profile.blood_pressure_sys}/${profile.blood_pressure_dia}`
                    : '—'}
                  unit="mmHg"
                  color={profile?.blood_pressure_sys > 140 ? 'red' : profile?.blood_pressure_sys > 130 ? 'amber' : 'green'}
                />
                <SnapCard label="Glucose"    value={fmt(profile?.blood_glucose, '—')}          unit="mg/dL"   color={profile?.blood_glucose > 125 ? 'red' : profile?.blood_glucose > 99 ? 'amber' : 'green'} />
                <SnapCard label="Cholesterol" value={fmt(profile?.cholesterol, '—')}           unit="mg/dL"   color={profile?.cholesterol > 240 ? 'red' : profile?.cholesterol > 200 ? 'amber' : 'green'} />
              </div>
            </section>

            {/* History & Symptoms */}
            {summary_lines?.length > 0 && (
              <section>
                <SectionTitle icon="📋">Health History & Symptoms</SectionTitle>
                <div className="grid gap-3">
                  {summary_lines.map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{s.field}</span>
                      <p className="text-sm text-gray-700 mt-1">{s.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Lifestyle Factors */}
            <section>
              <SectionTitle icon="🌿">Lifestyle Factors</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Smoking</p>
                  <Pill tone={habits.smoking === 'Yes' ? 'red' : 'green'}>{habits.smoking}</Pill>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Alcohol</p>
                  <Pill tone={habits.alcohol === 'Yes' ? 'amber' : 'green'}>{habits.alcohol}</Pill>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Exercise</p>
                  <Pill tone="blue">{habits.exercise_freq}</Pill>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Diet</p>
                  <Pill tone="blue">{habits.diet_type}</Pill>
                </div>
              </div>
            </section>

            {/* Risk Bars */}
            <section>
              <SectionTitle icon="🧠">Risk Assessment</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <RiskBar label="Heart Disease Risk" value={risks?.heart}         color="red"    />
                <RiskBar label="Diabetes Risk"       value={risks?.diabetes}      color="orange" />
                <RiskBar label="Stroke Risk"         value={risks?.stroke}        color="red"    />
                <RiskBar label="Hypertension Risk"   value={risks?.hypertension}  color="amber"  />
              </div>
            </section>

            {/* Key Notes */}
            {summary_lines?.length > 0 && (
              <section>
                <SectionTitle icon="📝">Key Notes</SectionTitle>
                <ul className="space-y-1.5">
                  {summary_lines.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span><strong>{s.field}:</strong> {s.value}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Doctor Access Summary */}
            {access_summary?.length > 0 && (
              <section>
                <SectionTitle icon="🩺">Treating / Authorized Doctors</SectionTitle>
                <div className="space-y-2">
                  {access_summary.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                        {a.doctor_name?.[0] || 'D'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-800">{a.doctor_name || '—'}</p>
                        <p className="text-xs text-blue-600">{a.specialization || 'General Physician'} {a.hospital_affiliation ? `· ${a.hospital_affiliation}` : ''}</p>
                      </div>
                      <Pill tone="green" className="ml-auto">Access Granted</Pill>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Reports */}
            <section>
              <SectionTitle icon="📄">Recent Lab Reports</SectionTitle>
              {reports?.length === 0
                ? <p className="text-sm text-gray-400 italic">No reports uploaded yet.</p>
                : (
                  <div className="space-y-2">
                    {reports.map((r, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{r.filename}</p>
                            <p className="text-xs text-gray-500">{r.report_type} · {fmtDate(r.uploaded_at)}</p>
                          </div>
                          {r.abnormal_count > 0 && <Pill tone="red">⚠ {r.abnormal_count} abnormal</Pill>}
                          {r.abnormal_count === 0 && <Pill tone="green">All Normal</Pill>}
                        </div>
                        {r.highlights?.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {r.highlights.map((h, j) => (
                              <li key={j} className="text-xs text-gray-600">• {h}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
            </section>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PAGE 2                                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden print:shadow-none print:rounded-none">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-8 py-4 text-white flex items-center justify-between">
            <h2 className="font-bold text-lg">Detailed Clinical Review — Page 2</h2>
            <span className="text-slate-300 text-sm">{subject.name}</span>
          </div>

          <div className="p-6 space-y-6">
            {/* Risk History */}
            <section>
              <SectionTitle icon="📈">Risk History (Latest 5)</SectionTitle>
              {risk_history?.length === 0
                ? <p className="text-sm text-gray-400 italic">No risk history recorded yet.</p>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left p-2 border border-gray-200 font-semibold">Date</th>
                          <th className="text-center p-2 border border-gray-200 font-semibold">Heart</th>
                          <th className="text-center p-2 border border-gray-200 font-semibold">Diabetes</th>
                          <th className="text-center p-2 border border-gray-200 font-semibold">Stroke</th>
                          <th className="text-center p-2 border border-gray-200 font-semibold">Hypertension</th>
                        </tr>
                      </thead>
                      <tbody>
                        {risk_history.slice(0, 5).map((r, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-2 border border-gray-200">{fmtDate(r.calculated_at)}</td>
                            <td className="p-2 border border-gray-200 text-center">{r.heart_risk}%</td>
                            <td className="p-2 border border-gray-200 text-center">{r.diabetes_risk}%</td>
                            <td className="p-2 border border-gray-200 text-center">{r.stroke_risk}%</td>
                            <td className="p-2 border border-gray-200 text-center">{r.hypertension_risk}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </section>

            {/* Recommendations */}
            <section>
              <SectionTitle icon="💡">Personalized Recommendations</SectionTitle>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { key: 'diet',     icon: '🥗', title: 'Diet' },
                  { key: 'exercise', icon: '🏃', title: 'Exercise' },
                  { key: 'lifestyle',icon: '🌿', title: 'Lifestyle' },
                ].map(({ key, icon, title }) => (
                  <div key={key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs font-bold text-gray-600 mb-2">{icon} {title}</p>
                    {recs[key]?.length > 0
                      ? <ul className="space-y-1">{recs[key].map((r, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-1.5"><span className="text-green-500 flex-shrink-0">•</span>{r}</li>
                        ))}</ul>
                      : <p className="text-xs text-gray-400 italic">No specific recommendations.</p>
                    }
                  </div>
                ))}
              </div>
              {recs.doctor_consultation?.length > 0 && (
                <div className="mt-3">
                  {recs.doctor_consultation.map((c, i) => (
                    <div key={i} className={`rounded-xl p-3 border ${c.urgency === 'HIGH' ? 'bg-red-50 border-red-200' : c.urgency === 'MEDIUM' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                      <p className="text-sm font-semibold text-gray-800">{c.message}</p>
                      {c.specialist && <p className="text-xs text-gray-500 mt-0.5">Specialist: {c.specialist}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Alerts & Red Flags */}
            <section>
              <SectionTitle icon="🚨">Alerts & Red Flags</SectionTitle>
              {alerts?.length === 0
                ? <p className="text-sm text-gray-400 italic">No active alerts.</p>
                : (
                  <div className="space-y-2">
                    {alerts.map((a, i) => (
                      <div key={i} className={`flex items-start gap-2 rounded-xl p-3 border text-sm ${
                        a.severity === 'high' || a.severity === 'error' ? 'bg-red-50 border-red-200' :
                        a.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <span className="text-base flex-shrink-0">
                          {a.severity === 'high' || a.severity === 'error' ? '🔴' : a.severity === 'warning' ? '🟡' : 'ℹ️'}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800 text-xs uppercase tracking-wide">{a.alert_type?.replace(/_/g,' ')}</p>
                          <p className="text-gray-700 text-sm">{a.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(a.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </section>

            {/* Handoff Checklist */}
            <div className="grid sm:grid-cols-2 gap-4">
              <section>
                <SectionTitle icon="✅">Handoff Checklist</SectionTitle>
                <ul className="space-y-1.5">
                  {[
                    'Patient identity and consent verified',
                    'Medication list reviewed and reconciled',
                    'Allergies documented and communicated',
                    'Latest vitals and lab results reviewed',
                    'Active alerts acknowledged',
                    'Follow-up appointments scheduled',
                    'Emergency contact noted',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0 bg-white" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <SectionTitle icon="⚠️">Missing Data Checklist</SectionTitle>
                <ul className="space-y-1.5">
                  {[
                    { label: 'Height / Weight', missing: !profile?.height || !profile?.weight },
                    { label: 'Blood Pressure',  missing: !profile?.blood_pressure_sys },
                    { label: 'Blood Glucose',   missing: !profile?.blood_glucose },
                    { label: 'Cholesterol',     missing: !profile?.cholesterol },
                    { label: 'Medical History', missing: !profile?.medical_history },
                    { label: 'Family History',  missing: !profile?.family_history },
                    { label: 'Lab Reports',     missing: !reports?.length },
                  ].map(({ label, missing }, i) => (
                    <li key={i} className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${missing ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'}`}>
                      <span>{missing ? '❌' : '✅'}</span>
                      {label}
                      {missing && <span className="ml-auto text-red-500 font-semibold">Missing</span>}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Disclaimer Footer */}
            <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                <strong>⚕️ Medical Disclaimer:</strong> This Life Print summary is generated by LifeSet's AI-assisted
                preventive healthcare platform for informational and care-coordination purposes only.
                It does not constitute a medical diagnosis, prescription, or professional medical advice.
                All clinical decisions must be made by a qualified healthcare professional.
                Risk scores are screening estimates only. Data accuracy depends on user-provided inputs.
                <br /><br />
                <strong>Confidentiality Notice:</strong> This document contains private health information.
                Unauthorised disclosure is prohibited.
              </p>
              <p className="text-center text-xs text-gray-400 mt-3">
                LifeSet v3 · Life Print generated {fmtDateTime(generated_at)} · {window.location.hostname}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Print CSS ─────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .page-break-after { page-break-after: always; }
        }
      `}</style>
    </div>
  )
}
