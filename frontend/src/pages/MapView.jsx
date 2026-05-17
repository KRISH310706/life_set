import { useState, useEffect } from 'react'
import { Map, Marker, Overlay, ZoomControl } from 'pigeon-maps'
import { mapAPI } from '../api'

export default function MapView() {
  const [hospitals, setHospitals] = useState([])
  const [outbreaks, setOutbreaks] = useState([])
  const [filter, setFilter] = useState('all')
  const [showOutbreaks, setShowOutbreaks] = useState(true)
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const [nearbyOnly, setNearbyOnly] = useState(false)
  const [center, setCenter] = useState([19.076, 72.8777])
  const [zoom, setZoom] = useState(12)
  const [selectedId, setSelectedId] = useState(null)

  // Auto-detect location on page load
  useEffect(() => {
    detectLocation()
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported')
      fetchData()
      return
    }
    setLocating(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserLocation([lat, lng])
        setCenter([lat, lng])
        setZoom(14)
        setLocating(false)
        fetchData(lat, lng)
      },
      (err) => {
        console.log('Location error:', err)
        setLocError('Could not get location. Showing default area.')
        setLocating(false)
        fetchData()
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const fetchData = (lat, lng) => {
    Promise.all([
      mapAPI.hospitals(lat, lng),
      mapAPI.outbreaks(),
    ])
      .then(([h, o]) => {
        // API returns array directly, not wrapped in .data
        const hospitalsData = Array.isArray(h.data) ? h.data : (Array.isArray(h) ? h : [])
        const outbreaksData = Array.isArray(o.data) ? o.data : (Array.isArray(o) ? o : [])
        console.log('Hospitals loaded:', hospitalsData.length)
        console.log('Outbreaks loaded:', outbreaksData.length)
        setHospitals(hospitalsData)
        setOutbreaks(outbreaksData)
      })
      .catch(err => {
        console.error('API Error:', err)
      })
      .finally(() => setLoading(false))
  }

  const filtered = hospitals.filter(h => {
    if (filter !== 'all' && h.type !== filter) return false
    if (nearbyOnly && userLocation) return (h.distance_km || 999) <= 10
    return true
  })

  const flyTo = (lat, lng, id) => {
    setCenter([lat, lng])
    setZoom(16)
    setSelectedId(id)
  }

  const typeColor = (type) => ({
    hospital: 'bg-green-100 text-green-700 border-green-200',
    clinic: 'bg-blue-100 text-blue-700 border-blue-200',
    pharmacy: 'bg-purple-100 text-purple-700 border-purple-200',
  }[type] || 'bg-gray-100 text-gray-600')

  const markerColor = (type) => ({
    hospital: '#16a34a',
    clinic: '#2563eb',
    pharmacy: '#9333ea',
  }[type] || '#666')

  const markerEmoji = (type) => ({
    hospital: '🏥',
    clinic: '🏪',
    pharmacy: '💊',
  }[type] || '📍')

  const getDirectionsUrl = (h) => {
    if (userLocation) {
      return `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${h.lat},${h.lng}`
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-gray-900">Nearby Care Map 🗺️</h1>
          <p className="text-gray-500 mt-1">Find hospitals, clinics & pharmacies near you</p>
        </div>
        <button onClick={detectLocation} disabled={locating}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm disabled:opacity-60">
          {locating ? '⏳ Detecting...' : '📍 Refresh Location'}
        </button>
      </div>

      {locating && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <span className="animate-spin">⏳</span> Detecting your location...
        </div>
      )}
      {locError && <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">⚠️ {locError}</div>}
      {userLocation && !locating && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          📍 Location detected! Showing {filtered.length} nearby facilities.
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
          {['all', 'hospital', 'clinic', 'pharmacy'].map(opt => (
            <button key={opt} onClick={() => setFilter(opt)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                filter === opt ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>{opt === 'all' ? 'All' : opt + 's'}</button>
          ))}
        </div>
        {userLocation && (
          <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 cursor-pointer text-sm">
            <input type="checkbox" checked={nearbyOnly} onChange={e => setNearbyOnly(e.target.checked)} className="accent-green-600" />
            Within 10 km only
          </label>
        )}
        <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 cursor-pointer text-sm">
          <input type="checkbox" checked={showOutbreaks} onChange={e => setShowOutbreaks(e.target.checked)} className="accent-green-600" />
          Show Outbreak Zones
        </label>
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ height: 'calc(100vh - 350px)', minHeight: '400px', maxHeight: '600px' }}>
        {loading ? (
          <div className="h-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400">Loading map...</span>
          </div>
        ) : (
          <Map
            center={center}
            zoom={zoom}
            onBoundsChanged={({ center, zoom }) => {
              setCenter(center)
              setZoom(zoom)
            }}
          >
            <ZoomControl />

            {/* User location marker */}
            {userLocation && (
              <Marker anchor={userLocation} offset={[0, 0]}>
                <div style={{
                  width: 24, height: 24,
                  background: '#22c55e',
                  border: '4px solid white',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 8px rgba(34,197,94,0.3), 0 2px 10px rgba(0,0,0,0.3)',
                  animation: 'pulse 2s infinite'
                }} />
              </Marker>
            )}

            {/* Hospital/Clinic/Pharmacy markers */}
            {filtered.map(h => (
              <Overlay
                key={h.id}
                anchor={[h.lat, h.lng]}
                offset={[20, 20]}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedId(selectedId === h.id ? null : h.id)
                  }}
                  style={{
                    width: 40, height: 40,
                    background: markerColor(h.type),
                    border: '3px solid white',
                    borderRadius: '50%',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    cursor: 'pointer',
                    transform: selectedId === h.id ? 'scale(1.3)' : 'scale(1)',
                    transition: 'transform 0.2s'
                  }}>
                  {markerEmoji(h.type)}
                </div>
              </Overlay>
            ))}

            {/* Popup for selected marker */}
            {selectedId && (() => {
              const h = filtered.find(item => item.id === selectedId)
              if (!h) return null
              return (
                <Overlay anchor={[h.lat, h.lng]} offset={[130, 320]}>
                  <div style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: 16,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                    width: 280,
                    border: `3px solid ${markerColor(h.type)}`,
                    position: 'relative',
                    zIndex: 1000
                  }}>
                    {/* Arrow pointing down to marker */}
                    <div style={{
                      position: 'absolute',
                      bottom: -15,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '15px solid transparent',
                      borderRight: '15px solid transparent',
                      borderTop: `15px solid ${markerColor(h.type)}`
                    }} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 28 }}>{markerEmoji(h.type)}</span>
                        <div>
                          <p style={{ fontWeight: 'bold', margin: 0, fontSize: 14, lineHeight: 1.3 }}>{h.name}</p>
                          <p style={{ color: '#666', fontSize: 11, margin: 0, textTransform: 'capitalize' }}>{h.type}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedId(null) }} 
                        style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                    </div>
                    
                    <p style={{ color: '#555', fontSize: 12, margin: '8px 0', lineHeight: 1.4 }}>📍 {h.address}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, background: '#fef3c7', padding: '2px 8px', borderRadius: 6 }}>⭐ {h.rating}</span>
                      {h.distance_km && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>📍 {h.distance_km} km</span>}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                      {h.phone && h.phone !== 'N/A' && (
                        <a href={`tel:${h.phone}`} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          background: '#dcfce7', color: '#16a34a',
                          padding: '8px 12px', borderRadius: 8,
                          textDecoration: 'none', fontWeight: 600, fontSize: 12
                        }}>
                          📞 Call: {h.phone}
                        </a>
                      )}

                      <a href={getDirectionsUrl(h)} target="_blank" rel="noopener noreferrer" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: '#dbeafe', color: '#2563eb',
                        padding: '8px 12px', borderRadius: 8,
                        textDecoration: 'none', fontWeight: 600, fontSize: 12
                      }}>
                        🚗 Directions (Google Maps)
                      </a>

                      {h.website && h.website !== 'N/A' && (
                        <a href={h.website.startsWith('http') ? h.website : `https://${h.website}`} target="_blank" rel="noopener noreferrer" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          background: '#f3e8ff', color: '#9333ea',
                          padding: '8px 12px', borderRadius: 8,
                          textDecoration: 'none', fontWeight: 600, fontSize: 12
                        }}>
                          🌐 Visit Website
                        </a>
                      )}
                    </div>
                  </div>
                </Overlay>
              )
            })()}

            {/* Outbreak markers */}
            {showOutbreaks && outbreaks.map(o => (
              <Marker key={`outbreak-${o.id}`} anchor={[o.lat, o.lng]} offset={[0, 0]}>
                <div style={{
                  width: 50, height: 50,
                  background: o.severity === 'high' ? 'rgba(239,68,68,0.25)' : o.severity === 'medium' ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.25)',
                  border: `3px solid ${o.severity === 'high' ? '#ef4444' : o.severity === 'medium' ? '#f59e0b' : '#3b82f6'}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}>
                  ⚠️
                </div>
              </Marker>
            ))}
          </Map>
        )}
      </div>

      {/* Facility Cards */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">
          {userLocation ? `Nearby Facilities (${filtered.length})` : `All Facilities (${filtered.length})`}
        </h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(h => (
            <div key={h.id}
              onClick={() => flyTo(h.lat, h.lng, h.id)}
              className={`bg-white border rounded-2xl p-4 flex items-start gap-3 shadow-sm cursor-pointer hover:shadow-md transition-all ${selectedId === h.id ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-100'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${typeColor(h.type)}`}>
                {markerEmoji(h.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{h.name}</p>
                <p className="text-xs text-gray-400 truncate">{h.address}</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span>⭐ {h.rating}</span>
                  {h.distance_km && <span className="text-green-600 font-semibold">📍 {h.distance_km} km</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {h.phone && h.phone !== 'N/A' && (
                    <a href={`tel:${h.phone}`} onClick={e => e.stopPropagation()}
                      className="text-xs bg-green-100 text-green-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-green-200">
                      📞 Call
                    </a>
                  )}
                  <a href={getDirectionsUrl(h)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="text-xs bg-blue-100 text-blue-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-blue-200">
                    🚗 Directions
                  </a>
                  {h.website && h.website !== 'N/A' && (
                    <a href={h.website.startsWith('http') ? h.website : `https://${h.website}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="text-xs bg-purple-100 text-purple-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-purple-200">
                      🌐 Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outbreak Cards */}
      {showOutbreaks && outbreaks.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">⚠️ Active Outbreak Zones</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {outbreaks.map(o => (
              <div key={o.id}
                onClick={() => { setCenter([o.lat, o.lng]); setZoom(14) }}
                className={`rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${
                  o.severity === 'high' ? 'bg-red-50 border-red-200' :
                  o.severity === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
                }`}>
                <p className="font-semibold">🦠 {o.disease} – {o.area}</p>
                <p className="text-sm text-gray-600">{o.cases} cases • {o.severity} severity</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 8px rgba(34,197,94,0.3), 0 2px 10px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 0 16px rgba(34,197,94,0.1), 0 2px 10px rgba(0,0,0,0.3); }
        }
      `}</style>
    </div>
  )
}
