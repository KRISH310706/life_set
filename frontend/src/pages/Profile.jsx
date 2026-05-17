import { useState, useEffect } from 'react'
import { healthAPI, accessAPI } from '../api'
import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate          = useNavigate()
  const isDoctor          = user?.role === 'doctor'   // ← FIX: was undefined before

  const [profile,    setProfile]    = useState(null)
  const [risks,      setRisks]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [myDoctors,  setMyDoctors]  = useState([])
  const [myPatients, setMyPatients] = useState([])
  const [revokeMsg,  setRevokeMsg]  = useState('')

  useEffect(() => {
    if (!user) return
    Promise.all([
      healthAPI.getProfile(user.user_id),
      healthAPI.getRisks(user.user_id).catch(() => null),
    ]).then(([p, r]) => {
      setProfile(p.data)
      if (r?.data) setRisks(r.data.risks)
    }).catch(() => {})
    .finally(() => setLoading(false))

    // Fetch connected doctors/patients based on role
    if (!isDoctor) {
      accessAPI.myDoctors(user.user_id)
        .then(r => setMyDoctors(r.data || []))
        .catch(() => {})
    } else {
      accessAPI.myPatients(user.user_id)
        .then(r => setMyPatients(r.data || []))
        .catch(() => {})
    }
  }, [user])

  const handleLogout = () => { logout(); navigate('/') }

  const revokeDoctor = async (requestId, doctorName) => {
    try {
      await accessAPI.revoke(requestId, user.user_id)
      setMyDoctors(prev => prev.filter(d => d.request_id !== requestId))
      setRevokeMsg(`✅ Access revoked for Dr. ${doctorName}`)
      setTimeout(() => setRevokeMsg(''), 3000)
    } catch (e) {
      setRevokeMsg('❌ Failed to revoke access. Try again.')
    }
  }

  const revokePatient = async (requestId, patientName) => {
    try {
      await accessAPI.revoke(requestId, user.user_id)
      setMyPatients(prev => prev.filter(p => p.request_id !== requestId))
      setRevokeMsg(`✅ Access to ${patientName} removed`)
      setTimeout(() => setRevokeMsg(''), 3000)
    } catch (e) {
      setRevokeMsg('❌ Failed to remove access. Try again.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-up">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  const bmi = profile?.weight && profile?.height
    ? (profile.weight / ((profile.height / 100) ** 2)).toFixed(1)
    : null

  const bmiLabel = !bmi ? null
    : bmi < 18.5 ? 'Underweight'
    : bmi < 25   ? 'Healthy'
    : bmi < 30   ? 'Overweight'
    : 'Obese'

  const bmiColor = !bmi ? 'text-gray-400'
    : bmi < 25 ? 'text-green-600'
    : bmi < 30 ? 'text-amber-600'
    : 'text-red-600'

  const completionFields = ['age','gender','weight','height','exercise_freq','diet_type']
  const filled     = completionFields.filter(k => profile?.[k]).length
  const completion = Math.round((filled / completionFields.length) * 100)

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">

      {/* ── Header Card ── */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
        <div className="relative flex items-center gap-5">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-4xl font-bold border-2 border-white/30 flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-3xl">{user?.name}</h1>
            <p className="text-green-200 mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${isDoctor ? 'bg-blue-400/30' : 'bg-white/20'}`}>
                {isDoctor ? '🩺 Doctor' : '🏥 Patient'}
              </span>
              {profile?.age && (
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                  {profile.age} yrs · {profile.gender}
                </span>
              )}
              {user?.is_verified && (
                <span className="text-xs bg-green-400/30 px-3 py-1 rounded-full">✓ Verified</span>
              )}
            </div>
          </div>
        </div>

        {/* Profile completion — patients only */}
        {!isDoctor && (
          <div className="relative mt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-green-100 text-sm font-medium">Profile Completion</p>
              <p className="text-white font-bold text-sm">{completion}%</p>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-2 bg-white rounded-full transition-all duration-1000" style={{ width: `${completion}%` }} />
            </div>
            {completion < 100 && (
              <p className="text-green-200 text-xs mt-1">Complete your profile for more accurate risk analysis</p>
            )}
          </div>
        )}
      </div>

      {/* ── Stats Row — patients only ── */}
      {!isDoctor && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{bmi || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">BMI</p>
            {bmiLabel && <p className={`text-xs font-semibold mt-1 ${bmiColor}`}>{bmiLabel}</p>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {risks ? `${Math.max(risks.heart||0, risks.diabetes||0, risks.stroke||0, risks.hypertension||0)}%` : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Peak Risk</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{profile?.weight ? `${profile.weight}kg` : '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Weight</p>
          </div>
        </div>
      )}

      {/* ── Doctor Profile Info ── */}
      {isDoctor && user && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Doctor Profile</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Name',          val: user.name },
              { label: 'Email',         val: user.email },
              { label: 'Phone',         val: user.phone },
              { label: 'Specialization',val: user.specialization },
              { label: 'Hospital',      val: user.hospital_affiliation },
              { label: 'Verified',      val: user.is_verified ? '✅ Yes' : '❌ Not yet' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                <p className={`text-sm font-semibold mt-0.5 ${item.val ? 'text-gray-800' : 'text-gray-300'}`}>
                  {item.val || 'Not set'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── My Patients — doctors only ── */}
      {isDoctor && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            👥 My Connected Patients
          </h2>
          <p className="text-xs text-gray-400 mb-4">Patients who have granted you access to their health records.</p>

          {revokeMsg && (
            <div className={`rounded-xl px-4 py-3 text-sm mb-4 border ${revokeMsg.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {revokeMsg}
            </div>
          )}

          {myPatients.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm text-gray-600 font-medium">No connected patients yet</p>
              <p className="text-xs text-gray-400 mt-1">When patients grant you access, they will appear here</p>
              <button onClick={() => navigate('/app/access')}
                className="mt-3 text-sm text-green-600 hover:text-green-700 font-semibold hover:underline">
                Go to Access Requests →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myPatients.map(patient => (
                <div key={patient.request_id}
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-green-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {patient.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{patient.name}</p>
                      <p className="text-xs text-gray-500">{patient.email}</p>
                      <p className="text-xs text-green-600 font-medium mt-0.5">
                        ✅ Read-only access granted
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/app/patient/${patient.patient_id}`)}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 font-semibold px-3 py-2 rounded-xl transition-all">
                      👁️ View Records
                    </button>
                    <button
                      onClick={() => revokePatient(patient.request_id, patient.name)}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold px-3 py-2 rounded-xl transition-all">
                      🚫 Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Health Details — patients only ── */}
      {!isDoctor && profile && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Health Profile</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Age',            val: profile.age    ? `${profile.age} years` : null },
              { label: 'Gender',         val: profile.gender },
              { label: 'Height',         val: profile.height ? `${profile.height} cm`   : null },
              { label: 'Weight',         val: profile.weight ? `${profile.weight} kg`   : null },
              { label: 'Exercise',       val: profile.exercise_freq },
              { label: 'Diet',           val: profile.diet_type?.replace('-', ' ') },
              { label: 'Smoking',        val: profile.smoking ? 'Yes ⚠️' : 'No ✅' },
              { label: 'Alcohol',        val: profile.alcohol ? 'Yes'    : 'No' },
              { label: 'Blood Pressure', val: profile.blood_pressure_sys ? `${profile.blood_pressure_sys}/${profile.blood_pressure_dia} mmHg` : null },
              { label: 'Blood Glucose',  val: profile.blood_glucose  ? `${profile.blood_glucose} mg/dL`  : null },
              { label: 'Cholesterol',    val: profile.cholesterol    ? `${profile.cholesterol} mg/dL`    : null },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                <p className={`text-sm font-semibold mt-0.5 capitalize ${item.val ? 'text-gray-800' : 'text-gray-300'}`}>
                  {item.val || 'Not set'}
                </p>
              </div>
            ))}
          </div>
          {profile.medical_history && (
            <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 font-medium mb-1">Medical History</p>
              <p className="text-sm text-gray-700">{profile.medical_history}</p>
            </div>
          )}
          {profile.family_history && (
            <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 font-medium mb-1">Family History</p>
              <p className="text-sm text-gray-700">{profile.family_history}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Risk Snapshot — patients only ── */}
      {!isDoctor && risks && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Risk Snapshot</h2>
          <div className="space-y-3">
            {[
              { label: 'Heart Disease', val: risks.heart,        color: 'bg-red-400'    },
              { label: 'Diabetes',      val: risks.diabetes,     color: 'bg-amber-400'  },
              { label: 'Stroke',        val: risks.stroke,       color: 'bg-blue-400'   },
              { label: 'Hypertension',  val: risks.hypertension, color: 'bg-purple-400' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3">
                <p className="text-sm text-gray-600 w-32 flex-shrink-0">{r.label}</p>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-2 ${r.color} rounded-full transition-all duration-1000`}
                    style={{ width: `${r.val || 0}%` }} />
                </div>
                <p className="text-sm font-bold text-gray-800 w-12 text-right">{r.val || 0}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Doctors With Access — patients only ── */}
      {!isDoctor && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            🩺 Doctors With Access to Your Records
          </h2>
          <p className="text-xs text-gray-400 mb-4">These doctors can view your health records. You can remove their access anytime.</p>

          {revokeMsg && (
            <div className={`rounded-xl px-4 py-3 text-sm mb-4 border ${revokeMsg.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {revokeMsg}
            </div>
          )}

          {myDoctors.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
              <div className="text-3xl mb-2">🔒</div>
              <p className="text-sm text-gray-600 font-medium">No doctors have access to your records</p>
              <p className="text-xs text-gray-400 mt-1">When you approve a doctor's request, they will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myDoctors.map(doc => (
                <div key={doc.request_id}
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-red-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {doc.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Dr. {doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {doc.specialization || 'General Physician'}
                        {doc.hospital_affiliation ? ` · ${doc.hospital_affiliation}` : ''}
                      </p>
                      <p className="text-xs text-green-600 font-medium mt-0.5">
                        ✅ Read-only access · Cannot edit your data
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeDoctor(doc.request_id, doc.name)}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold px-3 py-2 rounded-xl transition-all">
                    🚫 Remove Access
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate(isDoctor ? '/app/access' : '/app/risk')}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all shadow-green-sm text-sm">
          {isDoctor ? '📋 View Access Requests' : '✏️ Update Health Profile'}
        </button>
        <button
          onClick={handleLogout}
          className="border border-red-200 text-red-500 font-semibold px-6 py-3 rounded-xl hover:bg-red-50 transition-all text-sm">
          Sign Out
        </button>
      </div>
    </div>
  )
}
