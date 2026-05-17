import { useState, useEffect } from 'react'
import { authAPI, accessAPI, ratingsAPI, chatAPI } from '../api'
import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'

function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onClick={() => !readonly && onChange && onChange(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`text-xl transition-transform ${!readonly && 'hover:scale-110 cursor-pointer'} ${s <= (hover || value) ? 'text-amber-400' : 'text-gray-200'}`}
        >★</button>
      ))}
    </div>
  )
}

function DoctorCard({ doctor, onSelect }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm card-hover cursor-pointer" onClick={() => onSelect(doctor)}>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-green-sm">
          {doctor.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">{doctor.name}</p>
              <p className="text-sm text-green-600 font-medium">{doctor.specialization || 'General Physician'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{doctor.hospital_affiliation || 'Independent Practice'}</p>
            </div>
            {doctor.is_verified ? (
              <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">✓ Verified</span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <StarRating value={doctor.avg_rating} readonly />
            <span className="text-sm font-bold text-gray-800">{doctor.avg_rating > 0 ? doctor.avg_rating : '—'}</span>
            <span className="text-xs text-gray-400">({doctor.review_count} reviews)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DoctorModal({ doctor, onClose, user }) {
  const [ratings, setRatings] = useState(null)
  const [myRating, setMyRating] = useState(null)
  const [stars, setStars] = useState(0)
  const [review, setReview] = useState('')
  const [access, setAccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!doctor) return
    ratingsAPI.doctor(doctor.id).then(r => setRatings(r.data))
    if (user?.role === 'patient') {
      ratingsAPI.myRating(doctor.id, user.user_id).then(r => {
        if (r.data) { setMyRating(r.data); setStars(r.data.stars); setReview(r.data.review || '') }
      }).catch(() => {})
      accessAPI.checkAccess(doctor.id, user.user_id).then(r => setAccess(r.data)).catch(() => {})
    }
  }, [doctor])

  const submitRating = async () => {
    if (!stars) return
    setSubmitting(true)
    try {
      await ratingsAPI.rate({ doctor_id: doctor.id, patient_id: user.user_id, stars, review })
      const r = await ratingsAPI.doctor(doctor.id)
      setRatings(r.data); setMyRating({ stars, review })
      setMsg('Rating submitted! ✅')
    } finally { setSubmitting(false) }
  }

  const requestAccess = async () => {
    try {
      await accessAPI.sendRequest({ 
        doctor_id: doctor.id, 
        patient_id: user.user_id,
        initiated_by: 'patient',
        message: `${user.name} wants to grant you access to their health records for better care.`
      })
      setAccess({ has_access: false, status: 'pending' })
      setMsg('Access request sent to doctor! They will be notified.')
    } catch(e) { setMsg(e.response?.data?.detail || 'Request failed') }
  }

  const startChat = async () => {
    await chatAPI.send({ sender_id: user.user_id, receiver_id: doctor.id, content: 'Hello Doctor, I would like to consult with you.' }).catch(() => {})
    onClose()
    navigate('/app/messages')
  }

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto" 
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ minHeight: '100vh' }}
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl my-4 relative animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-br from-green-600 to-green-800 p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl relative">
          <button 
            onClick={onClose} 
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors text-lg"
          >
            ✕
          </button>
          <div className="flex items-center gap-3 sm:gap-4 pr-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl sm:text-3xl font-bold border-2 border-white/30 flex-shrink-0">
              {doctor.name?.[0]?.toUpperCase()}
            </div>
            <div className="text-white min-w-0">
              <p className="font-display text-lg sm:text-2xl truncate">{doctor.name}</p>
              <p className="text-green-200 text-xs sm:text-sm">{doctor.specialization || 'General Physician'}</p>
              <p className="text-green-300 text-xs mt-0.5 truncate">{doctor.hospital_affiliation}</p>
            </div>
          </div>
          {ratings && (
            <div className="mt-3 sm:mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
              <StarRating value={Math.round(ratings.avg_rating)} readonly />
              <span className="text-white font-bold text-sm sm:text-base">{ratings.avg_rating}/5</span>
              <span className="text-green-200 text-xs sm:text-sm">({ratings.total_reviews} reviews)</span>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[60vh] overflow-y-auto">
          {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">{msg}</div>}

          {/* Actions */}
          {user?.role === 'patient' && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button onClick={startChat} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-green-sm flex items-center justify-center gap-2">
                💬 Send Message
              </button>
              {(!access?.status || access?.status === 'none' || access?.status === 'rejected' || access?.status === 'revoked') && (
                <button onClick={requestAccess} className="flex-1 border border-green-300 text-green-700 hover:bg-green-50 font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  🔓 Grant Access
                </button>
              )}
              {access?.status === 'pending' && <span className="flex-1 text-center text-sm text-amber-600 bg-amber-50 py-2.5 rounded-xl border border-amber-200">⏳ Waiting for Doctor</span>}
              {access?.status === 'accepted' && <span className="flex-1 text-center text-sm text-green-600 bg-green-50 py-2.5 rounded-xl border border-green-200">✅ Access Granted</span>}
            </div>
          )}

          {/* Rating Breakdown */}
          {ratings && ratings.total_reviews > 0 && (
            <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Rating Breakdown</h3>
              {[5,4,3,2,1].map(s => {
                const count = ratings.breakdown[String(s)] || 0
                const pct = ratings.total_reviews > 0 ? (count / ratings.total_reviews) * 100 : 0
                return (
                  <div key={s} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-gray-500 w-6">{s}★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Reviews */}
          {ratings?.reviews?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Recent Reviews</h3>
              <div className="space-y-2 sm:space-y-3 max-h-32 sm:max-h-40 overflow-y-auto">
                {ratings.reviews.map((r, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.patient_name}</p>
                      <div className="flex-shrink-0"><StarRating value={r.stars} readonly /></div>
                    </div>
                    {r.review && <p className="text-xs text-gray-500 italic line-clamp-2">"{r.review}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Rating */}
          {user?.role === 'patient' && (
            <div className="bg-green-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-green-100">
              <h3 className="font-semibold text-green-800 mb-3 text-sm">{myRating ? 'Update Your Rating' : 'Rate This Doctor'}</h3>
              <StarRating value={stars} onChange={setStars} />
              <textarea value={review} onChange={e => setReview(e.target.value)} rows={2}
                placeholder="Write a brief review (optional)..."
                className="w-full mt-3 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button onClick={submitRating} disabled={!stars || submitting}
                className="mt-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all w-full sm:w-auto">
                {submitting ? 'Submitting...' : myRating ? 'Update Rating' : 'Submit Rating'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DoctorsPage() {
  const { user } = useAuth()
  const [doctors, setDoctors] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    authAPI.doctors().then(r => { setDoctors(r.data); setFiltered(r.data) }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(doctors.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      d.specialization?.toLowerCase().includes(q) ||
      d.hospital_affiliation?.toLowerCase().includes(q)
    ))
  }, [search, doctors])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const res = await authAPI.search(searchQuery)
      setSearchResults(res.data)
    } finally { setSearchLoading(false) }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl text-gray-900">Find Doctors 🩺</h1>
        <p className="text-gray-500 mt-1">Search, connect, and consult with healthcare professionals</p>
      </div>

      {/* Search by phone/email */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">🔎 Search by Phone / Email / Name</h2>
        <div className="flex gap-3">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="Enter phone number, email, or name..."/>
          <button onClick={handleSearch} disabled={searchLoading}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-green-sm disabled:opacity-60">
            {searchLoading ? '...' : 'Search'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <div>
                  <p className="font-medium text-sm text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email} · {u.phone || 'No phone'} · <span className="capitalize font-medium">{u.role}</span></p>
                </div>
                {u.role === 'doctor' && (
                  <button onClick={() => setSelected(u)} className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-green-200 transition">View Profile</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doctor directory */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">All Doctors ({filtered.length})</h2>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-52"
            placeholder="Filter by name or specialty..."/>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">👨‍⚕️</div>
            <p className="font-semibold text-gray-600">No doctors found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(d => <DoctorCard key={d.id} doctor={d} onSelect={setSelected} />)}
          </div>
        )}
      </div>

      {selected && <DoctorModal doctor={selected} onClose={() => setSelected(null)} user={user} />}
    </div>
  )
}
