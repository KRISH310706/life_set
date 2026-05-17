import { useState, useEffect } from 'react'
import { alertsAPI } from '../api'
import { useAuth } from '../AuthContext'

const severityMap = {
  danger:  { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    icon: '🚨', badge: 'bg-red-100 text-red-700 border-red-200' },
  warning: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  icon: '⚠️', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   icon: 'ℹ️', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  success: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  icon: '✅', badge: 'bg-green-100 text-green-700 border-green-200' },
}

export default function Alerts() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  // Fetch and auto-mark-read on page open
  const fetchAlerts = async () => {
    try {
      const res = await alertsAPI.list(user.user_id)
      setAlerts(res.data)
      // Mark all as read when page is opened
      const unreadIds = res.data.filter(a => !a.is_read).map(a => a.id)
      if (unreadIds.length > 0) {
        await alertsAPI.markAllRead(user.user_id)
        // Update state to reflect read status
        setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })))
      }
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAlerts() }, [user])

  const markRead = async (id) => {
    await alertsAPI.markRead(id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: 1 } : a))
  }

  const markAllRead = async () => {
    await alertsAPI.markAllRead(user.user_id)
    setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })))
  }

  const deleteLocalAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.is_read
    if (filter === 'danger')  return a.severity === 'danger'
    if (filter === 'warning') return a.severity === 'warning'
    return true
  })

  const unread = alerts.filter(a => !a.is_read).length

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-gray-900">Alerts 🔔</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {unread > 0 ? `${unread} unread · ` : 'All caught up · '}
            {alerts.length} total alerts
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="text-sm font-semibold text-green-600 hover:text-green-700 border border-green-200 px-4 py-2 rounded-xl hover:bg-green-50 transition flex items-center gap-2">
            ✅ Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
        {[
          { id: 'all',     label: `All (${alerts.length})` },
          { id: 'unread',  label: `Unread (${unread})` },
          { id: 'danger',  label: 'High Risk' },
          { id: 'warning', label: 'Warnings' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.id ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}>{f.label}</button>
        ))}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-6xl mb-4">🎉</div>
          <p className="font-semibold text-gray-600">
            {filter === 'all' ? 'No alerts yet' : 'No alerts in this category'}
          </p>
          <p className="text-sm mt-1">
            {filter === 'all'
              ? 'Complete your health profile and run a risk analysis to receive personalized alerts.'
              : 'Try selecting a different filter above.'}
          </p>
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map(alert => {
          const s = severityMap[alert.severity] || severityMap.info
          return (
            <div
              key={alert.id}
              className={`rounded-2xl border p-4 flex items-start gap-4 transition-all duration-300 ${s.bg} ${s.border} ${
                alert.is_read ? 'opacity-60' : 'shadow-sm'
              }`}
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className={`text-sm font-medium leading-relaxed ${s.text}`}>
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize border ${s.badge}`}>
                      {alert.severity}
                    </span>
                    {!alert.is_read && (
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">
                    {new Date(alert.created_at).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  <div className="flex gap-3">
                    {!alert.is_read && (
                      <button onClick={() => markRead(alert.id)}
                        className="text-xs text-green-600 font-semibold hover:underline transition">
                        Mark read
                      </button>
                    )}
                    <button onClick={() => deleteLocalAlert(alert.id)}
                      className="text-xs text-gray-400 hover:text-red-500 transition">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
