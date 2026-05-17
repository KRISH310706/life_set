import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { alertsAPI, wellnessAPI, chatAPI } from '../api'
import LanguageSelector from './LanguageSelector'

// Hamburger Menu Icon Component
const HamburgerIcon = ({ isOpen, onClick }) => (
  <button 
    onClick={onClick}
    className="lg:hidden fixed top-4 left-4 z-[10000] w-10 h-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg border border-green-100 flex items-center justify-center"
    aria-label={isOpen ? 'Close menu' : 'Open menu'}
  >
    <div className="w-5 h-4 flex flex-col justify-between">
      <span className={`block h-0.5 bg-green-600 rounded transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
      <span className={`block h-0.5 bg-green-600 rounded transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`} />
      <span className={`block h-0.5 bg-green-600 rounded transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
    </div>
  </button>
)

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
  const [hoveredItem, setHoveredItem] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isDoctor = user?.role === 'doctor'
  const navItems = isDoctor ? doctorNav : patientNav

  // Close sidebar when clicking a nav link on mobile
  const handleNavClick = useCallback(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

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
  }, [user])

  const scoreColor = !healthScore ? 'bg-gray-200' :
    { green:'bg-green-500', yellow:'bg-yellow-400', orange:'bg-orange-500', red:'bg-red-500' }[healthScore.color] || 'bg-gray-400'

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30">
      {/* Mobile Hamburger Menu */}
      <HamburgerIcon isOpen={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Mobile Top Bar with Language Selector */}
      <div className="lg:hidden fixed top-4 right-4 z-[10000]">
        <LanguageSelector compact />
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={`w-64 sm:w-72 lg:w-64 bg-white/95 backdrop-blur-xl border-r border-green-100/50 flex flex-col fixed top-0 bottom-0 left-0 z-[9999] shadow-xl shadow-green-900/5 transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Close button for mobile */}
        <button 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          aria-label="Close sidebar"
        >
          ✕
        </button>
        {/* Brand */}
        <div className="px-5 py-5 border-b border-green-50">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <motion.div 
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 flex-shrink-0"
              whileHover={{ rotate: 5, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <span className="text-white font-bold text-lg">L</span>
            </motion.div>
            <div>
              <span className="font-display text-xl text-green-800 leading-none">LifeSet</span>
              <p className="text-xs text-gray-400 mt-0.5">{isDoctor ? 'Doctor Portal' : 'Preventive Care AI'}</p>
            </div>
          </motion.div>
          
          {/* Role Badge */}
          <motion.div 
            className={`mt-3 text-xs font-semibold px-4 py-1.5 rounded-full w-fit ${isDoctor ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            {isDoctor ? '🩺 Doctor' : '🏥 Patient'}
          </motion.div>
        </div>

        {/* Health Score (patients only) */}
        {!isDoctor && healthScore && (
          <motion.div 
            className="mx-3 mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100 shadow-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-green-800">Health Score</p>
              <motion.span 
                className={`text-xs font-bold text-white px-2.5 py-1 rounded-full ${scoreColor} shadow-sm`}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {healthScore.score}
              </motion.span>
            </div>
            <div className="h-2 bg-green-100 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${scoreColor} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${healthScore.score}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <p className="text-xs text-green-700 mt-2 font-medium">{healthScore.label}</p>
          </motion.div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-3">Navigation</p>
          {navItems.map((item, index) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              onHoverStart={() => setHoveredItem(item.to)}
              onHoverEnd={() => setHoveredItem(null)}
            >
              <NavLink 
                to={item.to} 
                end={item.end}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-800 shadow-sm' 
                      : 'text-gray-600 hover:bg-green-50/50 hover:text-green-700'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-r-full"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          exit={{ scaleY: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </AnimatePresence>
                    
                    <motion.span 
                      className="text-lg w-6 text-center"
                      animate={hoveredItem === item.to ? { scale: 1.2, rotate: [0, -10, 10, 0] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {item.icon}
                    </motion.span>
                    <span className="flex-1">{item.label}</span>
                    
                    {/* Badges */}
                    {item.badge === 'alerts' && unreadAlerts > 0 && (
                      <motion.span 
                        className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-sm"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        {unreadAlerts}
                      </motion.span>
                    )}
                    {item.badge === 'msg' && unreadMsgs > 0 && (
                      <motion.span 
                        className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-sm"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        {unreadMsgs}
                      </motion.span>
                    )}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* User footer */}
        <motion.div 
          className="px-4 py-4 border-t border-green-50 bg-gradient-to-r from-gray-50/50 to-green-50/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <motion.div 
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg ${isDoctor ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/30' : 'bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/30'}`}
              whileHover={{ scale: 1.1 }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </motion.div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          
          {/* Language Selector */}
          <div className="mb-3">
            <LanguageSelector compact />
          </div>
          
          <motion.button 
            onClick={() => { logout(); navigate('/') }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 border border-red-100 transition-all font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>🚪</span> Sign Out
          </motion.button>
        </motion.div>
      </motion.aside>

      {/* Main Content */}
      <motion.main 
        className="lg:ml-64 flex-1 p-4 sm:p-6 lg:p-8 min-h-screen pt-16 lg:pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Outlet />
      </motion.main>
    </div>
  )
}