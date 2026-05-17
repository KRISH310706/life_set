import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useState, useEffect } from 'react'
import { alertsAPI, wellnessAPI, chatAPI } from '../api'
import LanguageSelector from './LanguageSelector'

const patientNav = [
  { to: '/app',          label: 'Dashboard',     icon: '🏠', end: true },
  { to: '/app/risk',     label: 'Risk Analysis',  icon: '🧠' },
  { to: '/app/wellness', label: 'Diet & Fitness', icon: '🥗' },
  { to: '/app/reports',  label: 'Lab Reports',    icon: '📄' },
  { to: '/app/map',      label: 'Nearby Care',    icon: '🗺️' },
  { to: '/app/chatbot',  label: 'Health AI Chat', icon: '🤖' },
  { to: '/app/doctors',  label: 'Find Doctors',   icon: '🩺' },
  { to: '/app/messages', label: 'Messages',       icon: '💬', badge: 'msg' },
  { to: '/app/access',   label: 'Access Requests',icon: '📋' },
  { to: '/app/life-print', label: 'Life Print',   icon: '🖨️' },
  { to: '/app/alerts',   label: 'Alerts',         icon: '🔔', badge: 'alerts' },
  { to: '/app/profile',  label: 'Profile',        icon: '👤' },
]

const doctorNav = [
  { to: '/app',          label: 'Dashboard',     icon: '🏠', end: true },
  { to: '/app/doctors',  label: 'Find Patients',  icon: '🔎' },
  { to: '/app/access',   label: 'Access Requests',icon: '📋' },
  { to: '/app/messages', label: 'Messages',       icon: '💬', badge: 'msg' },
  { to: '/app/life-print', label: 'Life Print',   icon: '🖨️' },
  { to: '/app/chatbot',  label: 'Health AI Chat', icon: '🤖' },
  { to: '/app/map',      label: 'Nearby Care',    icon: '🗺️' },
  { to: '/app/alerts',   label: 'Alerts',         icon: '🔔', badge: 'alerts' },
  { to: '/app/profile',  label: 'Profile',        icon: '👤' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [unreadMsgs, setUnreadMsgs] = useState(0)
  const [healthScore, setHealthScore] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const isDoctor = user?.role === 'doctor'
  const navItems = isDoctor ? doctorNav : patientNav

  // Toggle menu function
  const openMenu = () => {
    console.log('Opening menu')
    setMenuOpen(true)
  }
  
  const closeMenu = () => {
    console.log('Closing menu')
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!user) return
    const refresh = () => {
      alertsAPI.list(user.user_id).then(r => setUnreadAlerts(r.data.filter(a => !a.is_read).length)).catch(() => {})
      chatAPI.unreadCount(user.user_id).then(r => setUnreadMsgs(r.data.unread)).catch(() => {})
    }
    refresh()
    const iv = setInterval(refresh, 10000)
    if (!isDoctor) {
      wellnessAPI.healthScore(user.user_id).then(r => setHealthScore(r.data)).catch(() => {})
    }
    return () => clearInterval(iv)
  }, [user, isDoctor])

  const scoreColor = !healthScore ? 'bg-gray-200' :
    { green:'bg-green-500', yellow:'bg-yellow-400', orange:'bg-orange-500', red:'bg-red-500' }[healthScore.color] || 'bg-gray-400'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30">
      
      {/* ========== MOBILE HEADER ========== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4 shadow-sm">
        {/* Hamburger Button */}
        <button 
          type="button"
          onClick={openMenu}
          className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center active:bg-green-600"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
            <span className="text-white font-bold">L</span>
          </div>
          <span className="font-bold text-green-700">LifeSet</span>
        </div>
        
        {/* Language */}
        <div className="w-10">
          <LanguageSelector compact />
        </div>
      </header>

      {/* ========== MOBILE MENU OVERLAY ========== */}
      {menuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[998]"
          onClick={closeMenu}
        />
      )}

      {/* ========== MOBILE SIDEBAR ========== */}
      <div 
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-[999] transform transition-transform duration-300 shadow-2xl ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close Button */}
        <button 
          type="button"
          onClick={closeMenu}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Brand */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <div>
              <div className="font-bold text-lg text-green-800">LifeSet</div>
              <div className="text-xs text-gray-400">{isDoctor ? 'Doctor Portal' : 'Health Dashboard'}</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {navItems.map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 ${
                  isActive 
                    ? 'bg-green-100 text-green-700 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge === 'alerts' && unreadAlerts > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unreadAlerts}</span>
              )}
              {item.badge === 'msg' && unreadMsgs > 0 && (
                <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5">{unreadMsgs}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 truncate">{user?.name}</div>
              <div className="text-xs text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>
          <button 
            onClick={() => { logout(); navigate('/'); closeMenu(); }}
            className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100"
          >
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* ========== DESKTOP SIDEBAR ========== */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:top-0 lg:left-0 lg:bottom-0 lg:w-64 bg-white border-r border-gray-100">
        {/* Brand */}
        <div className="p-5 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <div>
              <div className="font-bold text-xl text-green-800">LifeSet</div>
              <div className="text-xs text-gray-400">{isDoctor ? 'Doctor Portal' : 'Preventive Care AI'}</div>
            </div>
          </div>
          <div className={`mt-3 text-xs font-semibold px-3 py-1 rounded-full w-fit ${isDoctor ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            {isDoctor ? '🩺 Doctor' : '🏥 Patient'}
          </div>
        </div>

        {/* Health Score (patients only) */}
        {!isDoctor && healthScore && (
          <div className="mx-3 mt-4 bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-green-800">Health Score</span>
              <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${scoreColor}`}>{healthScore.score}</span>
            </div>
            <div className="h-2 bg-green-100 rounded-full overflow-hidden">
              <div className={`h-full ${scoreColor} rounded-full transition-all`} style={{ width: `${healthScore.score}%` }} />
            </div>
            <div className="text-xs text-green-700 mt-2">{healthScore.label}</div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink 
              key={item.to}
              to={item.to} 
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge === 'alerts' && unreadAlerts > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadAlerts}</span>
              )}
              {item.badge === 'msg' && unreadMsgs > 0 && (
                <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadMsgs}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-gray-50">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isDoctor ? 'bg-blue-500' : 'bg-green-500'}`}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">{user?.name}</div>
              <div className="text-xs text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>
          <div className="mb-3">
            <LanguageSelector compact />
          </div>
          <button 
            onClick={() => { logout(); navigate('/') }}
            className="w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg border border-red-100 font-medium"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-4 pb-20 lg:pb-4 px-4 lg:px-6">
        <Outlet />
      </main>

      {/* ========== MOBILE BOTTOM NAV ========== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 shadow-lg">
        <div className="flex h-full">
          {[
            { to: '/app', icon: '🏠', label: 'Home', end: true },
            { to: '/app/risk', icon: '🧠', label: 'Risk' },
            { to: '/app/wellness', icon: '🥗', label: 'Wellness' },
            { to: '/app/chatbot', icon: '🤖', label: 'AI Chat' },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center ${
                  isActive ? 'text-green-600' : 'text-gray-400'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </NavLink>
          ))}
          {/* More button */}
          <button
            type="button"
            onClick={openMenu}
            className="flex-1 flex flex-col items-center justify-center text-gray-400 active:text-green-600"
          >
            <span className="text-xl">☰</span>
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
