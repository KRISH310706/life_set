import { useState, useEffect } from 'react'
import { healthAPI } from '../api'
import { useAuth } from '../AuthContext'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

const exerciseOptions = ['never','rarely','sometimes','regularly','daily']
const dietOptions     = ['mixed','vegetarian','vegan','high-sugar','junk','mediterranean','high-salt']

function RiskGauge({ label, value, color }) {
  const r = 40, circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  const level = value >= 60 ? 'High' : value >= 35 ? 'Moderate' : 'Low'
  const levelColor = value >= 60 ? '#ef4444' : value >= 35 ? '#f59e0b' : '#22c55e'

  return (
    <div className="flex flex-col items-center p-5 bg-white rounded-2xl border border-gray-100 shadow-sm card-hover">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10"/>
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={levelColor} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="ring-animate"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1e293b">{value}%</text>
        <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#94a3b8">{level}</text>
      </svg>
      <p className="text-sm font-semibold text-gray-700 mt-2 text-center">{label}</p>
    </div>
  )
}

export default function RiskAnalysis() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    age: '', gender: 'male', weight: '', height: '',
    smoking: 0, alcohol: 0, exercise_freq: 'sometimes', diet_type: 'mixed',
    medical_history: '', symptoms: '', family_history: '',
    blood_pressure_sys: '', blood_pressure_dia: '', blood_glucose: '', cholesterol: '',
  })
  const [risks, setRisks] = useState(null)
  const [recs,  setRecs]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    healthAPI.getProfile(user.user_id).then(r => {
      const p = r.data
      setForm(f => ({...f,
        age: p.age || '', gender: p.gender || 'male',
        weight: p.weight || '', height: p.height || '',
        smoking: p.smoking || 0, alcohol: p.alcohol || 0,
        exercise_freq: p.exercise_freq || 'sometimes', diet_type: p.diet_type || 'mixed',
        medical_history: p.medical_history || '', symptoms: p.symptoms || '',
        family_history: p.family_history || '',
        blood_pressure_sys: p.blood_pressure_sys || '', blood_pressure_dia: p.blood_pressure_dia || '',
        blood_glucose: p.blood_glucose || '', cholesterol: p.cholesterol || '',
      }))
    }).catch(() => {})
  }, [user])

  const f = (k) => (e) => setForm(p => ({...p, [k]: e.target.value}))
  const ft = (k, v) => setForm(p => ({...p, [k]: v}))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await healthAPI.saveProfile({ user_id: user.user_id, ...form,
        age: +form.age, weight: +form.weight, height: +form.height,
        blood_pressure_sys: +form.blood_pressure_sys || null,
        blood_pressure_dia: +form.blood_pressure_dia || null,
        blood_glucose: +form.blood_glucose || null,
        cholesterol: +form.cholesterol || null,
      })
      const res = await healthAPI.getRisks(user.user_id)
      setRisks(res.data.risks)
      setRecs(res.data.recommendations)
      setSaved(true)
      setStep(3)
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message))
    } finally { setLoading(false) }
  }

  const steps = ['Personal', 'Lifestyle', 'Clinical', 'Results']

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl text-gray-900">AI Risk Analysis 🧠</h1>
        <p className="text-gray-500 mt-1">Fill in your health data to get personalized disease risk predictions</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < 3 && setStep(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                step === i ? 'bg-green-600 text-white shadow-green-sm' :
                i < step   ? 'bg-green-100 text-green-700' :
                             'bg-gray-100 text-gray-400'
              }`}
            >
              <span>{i + 1}</span> {s}
            </button>
            {i < steps.length - 1 && <div className={`h-0.5 w-8 rounded-full ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 0: Personal */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 animate-scale-in">
            <h2 className="font-semibold text-gray-900 text-lg">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Age</label>
                <input type="number" min="1" max="120" value={form.age} onChange={f('age')}
                  className="input" placeholder="e.g. 35" />
              </div>
              <div>
                <label className="label">Gender</label>
                <select value={form.gender} onChange={f('gender')} className="input">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Weight (kg)</label>
                <input type="number" value={form.weight} onChange={f('weight')} className="input" placeholder="e.g. 72" />
              </div>
              <div>
                <label className="label">Height (cm)</label>
                <input type="number" value={form.height} onChange={f('height')} className="input" placeholder="e.g. 170" />
              </div>
            </div>
            <div>
              <label className="label">Medical History (conditions, surgeries, medications)</label>
              <textarea value={form.medical_history} onChange={f('medical_history')} rows={3}
                className="input resize-none" placeholder="e.g. Hypertension diagnosed 2020, on amlodipine..." />
            </div>
            <div>
              <label className="label">Family History of Disease</label>
              <textarea value={form.family_history} onChange={f('family_history')} rows={2}
                className="input resize-none" placeholder="e.g. Father had heart disease, mother has diabetes..." />
            </div>
            <button type="button" onClick={() => setStep(1)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all">
              Next: Lifestyle →
            </button>
          </div>
        )}

        {/* Step 1: Lifestyle */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 animate-scale-in">
            <h2 className="font-semibold text-gray-900 text-lg">Lifestyle Habits</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="label">Smoking</label>
                <div className="flex gap-3 mt-2">
                  {[['No', 0], ['Yes', 1]].map(([lbl, val]) => (
                    <button key={lbl} type="button"
                      onClick={() => ft('smoking', val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        form.smoking === val ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-300'
                      }`}>{lbl}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Alcohol Consumption</label>
                <div className="flex gap-3 mt-2">
                  {[['No', 0], ['Yes', 1]].map(([lbl, val]) => (
                    <button key={lbl} type="button"
                      onClick={() => ft('alcohol', val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        form.alcohol === val ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-300'
                      }`}>{lbl}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="label">Exercise Frequency</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {exerciseOptions.map(opt => (
                  <button key={opt} type="button" onClick={() => ft('exercise_freq', opt)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                      form.exercise_freq === opt ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-300'
                    }`}>{opt}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Diet Type</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {dietOptions.map(opt => (
                  <button key={opt} type="button" onClick={() => ft('diet_type', opt)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                      form.diet_type === opt ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-300'
                    }`}>{opt.replace('-', ' ')}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Current Symptoms (optional)</label>
              <textarea value={form.symptoms} onChange={f('symptoms')} rows={3}
                className="input resize-none" placeholder="e.g. chest pain, frequent urination, fatigue, headache..." />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(0)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-all">← Back</button>
              <button type="button" onClick={() => setStep(2)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all">Next: Clinical →</button>
            </div>
          </div>
        )}

        {/* Step 2: Clinical */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 animate-scale-in">
            <h2 className="font-semibold text-gray-900 text-lg">Clinical Readings <span className="text-sm text-gray-400 font-normal">(optional but improves accuracy)</span></h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Blood Pressure Systolic (mmHg)</label>
                <input type="number" value={form.blood_pressure_sys} onChange={f('blood_pressure_sys')} className="input" placeholder="e.g. 120" />
              </div>
              <div>
                <label className="label">Blood Pressure Diastolic (mmHg)</label>
                <input type="number" value={form.blood_pressure_dia} onChange={f('blood_pressure_dia')} className="input" placeholder="e.g. 80" />
              </div>
              <div>
                <label className="label">Fasting Blood Glucose (mg/dL)</label>
                <input type="number" value={form.blood_glucose} onChange={f('blood_glucose')} className="input" placeholder="e.g. 90" />
              </div>
              <div>
                <label className="label">Total Cholesterol (mg/dL)</label>
                <input type="number" value={form.cholesterol} onChange={f('cholesterol')} className="input" placeholder="e.g. 180" />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
              💡 You can find these values on recent lab reports. Upload your report on the Lab Reports page for automatic extraction.
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-all">← Back</button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all shadow-green-sm">
                {loading ? '🧠 Analyzing...' : '🧠 Run AI Analysis'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && risks && (
          <div className="space-y-6 animate-scale-in">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 text-sm font-medium">
              ✅ Analysis complete! Your health profile has been saved.
            </div>

            {/* Gauges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <RiskGauge label="Heart Disease" value={risks.heart}       color="red" />
              <RiskGauge label="Diabetes"      value={risks.diabetes}    color="yellow" />
              <RiskGauge label="Stroke"        value={risks.stroke}      color="blue" />
              <RiskGauge label="Hypertension"  value={risks.hypertension} color="purple" />
            </div>

            {/* Radar Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Risk Overview Radar</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={[
                  { label: 'Heart',        value: risks.heart },
                  { label: 'Diabetes',     value: risks.diabetes },
                  { label: 'Stroke',       value: risks.stroke },
                  { label: 'Hypertension', value: risks.hypertension },
                ]}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Radar dataKey="value" stroke="#16a34a" fill="#22c55e" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Recommendations */}
            {recs && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Personalized Plan</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: '🥗 Diet', items: recs.diet },
                    { title: '🏃 Exercise', items: recs.exercise },
                    { title: '🌿 Lifestyle', items: recs.lifestyle },
                    { title: '🩺 Preventive Care', items: recs.preventive_care },
                  ].map(sec => (
                    <div key={sec.title} className="bg-gray-50 rounded-xl p-4">
                      <p className="font-semibold text-sm text-gray-800 mb-2">{sec.title}</p>
                      <ul className="space-y-1.5">
                        {(sec.items || []).map((item, i) => (
                          <li key={i} className="text-xs text-gray-600 flex gap-2">
                            <span className="text-green-500 flex-shrink-0">→</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {recs.doctor_consultation?.[0] && (
                  <div className={`mt-4 rounded-xl p-4 border text-sm font-medium ${
                    recs.doctor_consultation[0].urgency === 'HIGH' ? 'bg-red-50 border-red-200 text-red-800' :
                    recs.doctor_consultation[0].urgency === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                    'bg-green-50 border-green-200 text-green-800'
                  }`}>
                    🩺 {recs.doctor_consultation[0].message}
                  </div>
                )}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
              ⚠️ <strong>Disclaimer:</strong> These risk scores are estimates based on statistical models and are NOT a medical diagnosis. Always consult a qualified doctor for proper evaluation.
            </div>

            <button type="button" onClick={() => setStep(0)}
              className="border border-gray-200 text-gray-600 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-all">
              ← Update Profile
            </button>
          </div>
        )}
      </form>

      <style>{`
        .label { display:block; font-size:13px; font-weight:500; color:#374151; margin-bottom:6px; }
        .input { width:100%; border:1px solid #e5e7eb; border-radius:12px; padding:10px 14px; font-size:14px; outline:none; transition:all .2s; font-family:inherit; }
        .input:focus { border-color:#4ade80; box-shadow:0 0 0 3px rgba(74,222,128,.15); }
      `}</style>
    </div>
  )
}
