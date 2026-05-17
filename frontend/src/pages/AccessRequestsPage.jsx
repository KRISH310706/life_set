import { useState, useEffect } from 'react'
import { accessAPI, authAPI } from '../api'
import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'

export default function AccessRequestsPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const isDoctor  = user?.role === 'doctor'

  const [requests, setRequests]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [msg, setMsg]             = useState({ text: '', type: '' })
  const [search, setSearch]       = useState('')
  const [searchRes, setSearchRes] = useState([])
  const [searching, setSearching] = useState(false)
  const [requesting, setRequesting] = useState(null)
  const [revoking, setRevoking] = useState(null)

  const fetchRequests = async () => {
    try {
      const res = await accessAPI.myRequests(user.user_id, user.role)
      setRequests(res.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchRequests() }, [user])

  // Doctor: search for patients by name/email/phone
  const handleSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    try {
      const res = await authAPI.search(search, 'patient')
      setSearchRes(res.data)
    } finally { setSearching(false) }
  }

  // Doctor: send access request to patient
  const sendRequest = async (patientId, patientName) => {
    setRequesting(patientId)
    try {
      await accessAPI.sendRequest({
        doctor_id:  user.user_id,
        patient_id: patientId,
        initiated_by: 'doctor',
        message: `Dr. ${user.name} is requesting access to your health records to provide better care.`
      })
      setMsg({ text: `✅ Access request sent to ${patientName}!`, type: 'success' })
      setSearchRes([])
      setSearch('')
      fetchRequests()
    } catch (e) {
      setMsg({ text: e.response?.data?.detail || 'Failed to send request', type: 'error' })
    } finally { setRequesting(null) }
  }

  // Respond to a request (accept/reject)
  const respond = async (requestId, status, otherName) => {
    try {
      await accessAPI.respond({ request_id: requestId, status })
      const word = status === 'accepted' ? 'accepted' : 'declined'
      setMsg({ text: `✅ Request ${word} for ${isDoctor ? '' : 'Dr. '}${otherName}`, type: 'success' })
      fetchRequests()
    } catch (e) {
      setMsg({ text: e.response?.data?.detail || 'Error', type: 'error' })
    }
  }

  // Revoke access
  const revokeAccess = async (requestId, otherName) => {
    if (!confirm(`Are you sure you want to revoke access ${isDoctor ? 'to' : 'for'} ${isDoctor ? '' : 'Dr. '}${otherName}?`)) return
    setRevoking(requestId)
    try {
      await accessAPI.revoke(requestId, user.user_id)
      setMsg({ text: `✅ Access revoked successfully`, type: 'success' })
      fetchRequests()
    } catch (e) {
      setMsg({ text: e.response?.data?.detail || 'Failed to revoke', type: 'error' })
    } finally { setRevoking(null) }
  }

  const statusStyle = {
    pending:  'bg-amber-50 border-amber-200',
    accepted: 'bg-green-50 border-green-200',
    rejected: 'bg-red-50 border-red-100',
    revoked:  'bg-gray-50 border-gray-200',
  }
  const statusBadge = {
    pending:  'bg-amber-100 text-amber-700 border-amber-200',
    accepted: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-600 border-red-200',
    revoked:  'bg-gray-100 text-gray-600 border-gray-200',
  }
  const statusIcon = { pending: '⏳', accepted: '✅', rejected: '❌', revoked: '🚫' }

  // Separate pending requests that need action
  const pendingRequests = requests.filter(r => r.status === 'pending')
  const otherRequests = requests.filter(r => r.status !== 'pending')

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl text-gray-900">
          {isDoctor ? 'Patient Access 📋' : 'Doctor Access 📋'}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {isDoctor
            ? 'Manage access to patient health records'
            : 'Manage which doctors can view your health records'}
        </p>
      </div>

      {/* Status message */}
      {msg.text && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${
          msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {msg.text}
        </div>
      )}

      {/* DOCTOR: Search patients and send request */}
      {isDoctor && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🔎 Find Patient & Request Access
          </h2>
          <div className="flex gap-3 mb-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Search by patient name, email, or phone..."
            />
            <button onClick={handleSearch} disabled={searching || !search.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-green-sm">
              {searching ? '...' : 'Search'}
            </button>
          </div>

          {/* Search results */}
          {searchRes.length > 0 && (
            <div className="space-y-2">
              {searchRes.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm">
                      {p.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.email} {p.phone ? `· ${p.phone}` : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendRequest(p.id, p.name)}
                    disabled={requesting === p.id}
                    className="text-xs bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
                    {requesting === p.id
                      ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>Sending...</>
                      : '📋 Request Access'
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
          {search && searchRes.length === 0 && !searching && (
            <p className="text-sm text-gray-400 text-center py-3">No patients found for "{search}"</p>
          )}
        </div>
      )}

      {/* Pending Requests - Need Action */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            ⏳ Pending Requests
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
          </h2>
          <div className="space-y-3">
            {pendingRequests.map(req => {
              const initiatedByMe = (isDoctor && req.initiated_by === 'doctor') || (!isDoctor && (req.initiated_by === 'patient' || !req.initiated_by))
              const otherName = isDoctor ? req.patient_name : req.doctor_name
              
              return (
                <div key={req.id} className={`rounded-2xl border p-5 ${statusStyle.pending}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-sm ${isDoctor ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {otherName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        {isDoctor ? (
                          <>
                            <p className="font-semibold text-gray-900">{req.patient_name}</p>
                            <p className="text-xs text-gray-500">{req.patient_email}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-gray-900">Dr. {req.doctor_name}</p>
                            <p className="text-xs text-green-600 font-medium">{req.specialization || 'General Physician'}</p>
                            <p className="text-xs text-gray-500">{req.hospital_affiliation}</p>
                          </>
                        )}
                        {req.message && (
                          <p className="text-xs text-gray-600 italic mt-1.5 max-w-sm">"{req.message}"</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(req.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                          <span className="ml-2 text-amber-600 font-medium">
                            {initiatedByMe ? '(You initiated)' : `(${isDoctor ? 'Patient' : 'Doctor'} initiated)`}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize border flex-shrink-0 ${statusBadge.pending}`}>
                      {statusIcon.pending} Pending
                    </span>
                  </div>

                  {/* Action buttons - only show if OTHER party initiated */}
                  {!initiatedByMe && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-amber-200/50">
                      <button onClick={() => respond(req.id, 'accepted', otherName)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2">
                        ✅ {isDoctor ? 'Accept Access' : 'Grant Access'}
                      </button>
                      <button onClick={() => respond(req.id, 'rejected', otherName)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                        ❌ Decline
                      </button>
                    </div>
                  )}

                  {/* Waiting message if I initiated */}
                  {initiatedByMe && (
                    <div className="mt-3 pt-3 border-t border-amber-200/50 text-xs text-amber-700">
                      ⏳ Waiting for {isDoctor ? 'patient' : 'doctor'} to respond...
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active & Past Requests */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">
          {isDoctor ? 'My Patients' : 'My Doctors'}
          <span className="text-gray-400 font-normal text-sm ml-2">({otherRequests.length})</span>
        </h2>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
        ) : otherRequests.length === 0 && pendingRequests.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-semibold text-gray-600">No connections yet</p>
            <p className="text-sm mt-1">
              {isDoctor 
                ? 'Search for a patient above to request access to their records.' 
                : 'Go to Find Doctors and grant access to a doctor to get started.'}
            </p>
            {!isDoctor && (
              <button onClick={() => navigate('/app/doctors')}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
                Find Doctors →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {otherRequests.map(req => {
              const otherName = isDoctor ? req.patient_name : req.doctor_name
              
              return (
                <div key={req.id} className={`rounded-2xl border p-5 ${statusStyle[req.status] || 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-sm ${
                        req.status === 'accepted' ? (isDoctor ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600') : 'bg-gray-100 text-gray-500'
                      }`}>
                        {otherName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        {isDoctor ? (
                          <>
                            <p className="font-semibold text-gray-900">{req.patient_name}</p>
                            <p className="text-xs text-gray-500">{req.patient_email}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-gray-900">Dr. {req.doctor_name}</p>
                            <p className="text-xs text-green-600 font-medium">{req.specialization || 'General Physician'}</p>
                            <p className="text-xs text-gray-500">{req.hospital_affiliation}</p>
                          </>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {req.status === 'accepted' ? 'Connected since ' : ''}
                          {new Date(req.responded_at || req.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize border flex-shrink-0 ${statusBadge[req.status]}`}>
                      {statusIcon[req.status]} {req.status}
                    </span>
                  </div>

                  {/* Accepted - show view records and revoke */}
                  {req.status === 'accepted' && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <div className="flex items-center justify-between gap-3">
                        {isDoctor ? (
                          <button onClick={() => navigate(`/app/patient/${req.patient_id}`)}
                            className="text-sm font-semibold text-green-700 hover:text-green-800 flex items-center gap-1.5 bg-green-100 hover:bg-green-200 px-4 py-2 rounded-xl transition-all">
                            👁️ View Patient Records
                          </button>
                        ) : (
                          <p className="text-xs text-green-700">
                            🔒 Dr. {req.doctor_name} can view your health records (read-only)
                          </p>
                        )}
                        <button 
                          onClick={() => revokeAccess(req.id, otherName)}
                          disabled={revoking === req.id}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                          {revoking === req.id ? '...' : '🚫 Revoke Access'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Rejected/Revoked - show reconnect option */}
                  {(req.status === 'rejected' || req.status === 'revoked') && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {req.status === 'revoked' ? '🚫 Access was revoked.' : '❌ Request was declined.'}
                      </span>
                      {!isDoctor && (
                        <button 
                          onClick={() => navigate(`/app/doctors`)}
                          className="text-xs bg-green-100 hover:bg-green-200 text-green-700 font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5">
                          🔄 Reconnect
                        </button>
                      )}
                      {isDoctor && (
                        <button 
                          onClick={() => sendRequest(req.patient_id, req.patient_name)}
                          disabled={requesting === req.patient_id}
                          className="text-xs bg-green-100 hover:bg-green-200 text-green-700 font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50">
                          {requesting === req.patient_id ? '...' : '🔄 Request Again'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
