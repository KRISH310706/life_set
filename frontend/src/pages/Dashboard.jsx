import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { healthAPI, alertsAPI, wellnessAPI } from '../api'
import { useAuth } from '../AuthContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'

// Animated Risk Card with 3D effect
function RiskCard({ label, value, icon, color, index }) {
  const colorMap = {
    red:    { bg: 'from-red-50 to-rose-50', bar: 'from-red-400 to-rose-500', text: 'text-red-600', glow: 'shadow-red-200' },
    yellow: { bg: 'from-amber-50 to-yellow-50', bar: 'from-amber-400 to-yellow-500', text: 'text-amber-600', glow: 'shadow-amber-200' },
    blue:   { bg: 'from-blue-50 to-indigo-50', bar: 'from-blue-400 to-indigo-500', text: 'text-blue-600', glow: 'shadow-blue-200' },
    purple: { bg: 'from-purple-50 to-violet-50', bar: 'from-purple-400 to-violet-500', text: 'text-purple-600', glow: 'shadow-purple-200' },
  }
  const c = colorMap[color] || colorMap.blue
  const level = value >= 60 ? 'High' : value >= 35 ? 'Moderate' : 'Low'
  const levelColor = value >= 60 ? 'text-red-500' : value >= 35 ? 'text-amber-500' : 'text-green-500'

  return (
    <motion.div 
      className={`relative bg-white rounded-2xl p-5 border border-gray-100 shadow-lg overflow-hidden group cursor-pointer`}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.5, type: "spring" }}
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Gradient background on hover */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            <motion.p 
              className="text-3xl font-bold text-gray-900 mt-1"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
            >
              {value !== null ? `${value}%` : '—'}
            </motion.p>
          </div>
          <motion.div 
            className={`w-12 h-12 bg-gradient-to-br ${c.bg} rounded-xl flex items-center justify-center text-2xl shadow-lg ${c.glow}`}
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            {icon}
          </motion.div>
        </div>
        
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <motion.div
            className={`h-full bg-gradient-to-r ${c.bar} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${value || 0}%` }}
            transition={{ delay: index * 0.1 + 0.5, duration: 1, ease: "easeOut" }}
          />
        </div>
        
        <motion.p 
          className={`text-xs font-semibold ${levelColor}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 + 0.7 }}
        >
          {value !== null ? `${level} Risk` : 'No data yet'}
        </motion.p>
      </div>
    </motion.div>
  )
}

// Animated Health Score Ring
function HealthScoreRing({ score, color, label }) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference * (1 - score / 100)
  
  const colors = {
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    red: '#ef4444',
  }
  
  const strokeColor = colors[color] || colors.green

  return (
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />
        <motion.circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
          style={{ filter: `drop-shadow(0 0 8px ${strokeColor}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-2xl font-bold text-gray-800"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, type: "spring" }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    </div>
  )
}

// Stagger animation container
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [risks, setRisks] = useState(null)
  const [history, setHistory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [recs, setRecs] = useState(null)
  const [healthScore, setHealthScore] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      healthAPI.getRisks(user.user_id).catch(() => null),
      healthAPI.getHistory(user.user_id).catch(() => ({ data: [] })),
      alertsAPI.list(user.user_id).catch(() => ({ data: [] })),
      wellnessAPI.healthScore(user.user_id).catch(() => null),
    ]).then(([riskRes, histRes, alertRes, scoreRes]) => {
      if (riskRes?.data) {
        setRisks(riskRes.data.risks)
        setRecs(riskRes.data.recommendations)
      }
      setHistory((histRes?.data || []).slice(0, 7).reverse())
      setAlerts((alertRes?.data || []).filter(a => !a.is_read).slice(0, 3))
      if (scoreRes?.data) setHealthScore(scoreRes.data)
    }).finally(() => setLoading(false))
  }, [user])

  const chartData = history.map((h, i) => ({
    name: `#${i + 1}`,
    Heart: h.heart_risk,
    Diabetes: h.diabetes_risk,
    Stroke: h.stroke_risk,
    Hypertension: h.hypertension_risk,
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="skeleton h-12 w-12 rounded-full" />
          <div className="skeleton h-8 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <motion.div 
              key={i} 
              className="skeleton h-40 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        variants={itemVariants}
      >
        <div className="flex items-center gap-4">
          <motion.div 
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-green-500/30"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {user?.name?.[0]?.toUpperCase()}
          </motion.div>
          <div>
            <motion.h1 
              className="font-display text-3xl text-gray-900"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Hello, {user?.name?.split(' ')[0]} 👋
            </motion.h1>
            <p className="text-gray-500 mt-0.5">Here's your health overview</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link to="/app/risk" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 flex items-center gap-2">
            Run Risk Analysis
            <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Risk Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RiskCard label="Heart Disease" value={risks?.heart ?? null} icon="❤️" color="red" index={0} />
        <RiskCard label="Diabetes" value={risks?.diabetes ?? null} icon="🩸" color="yellow" index={1} />
        <RiskCard label="Stroke" value={risks?.stroke ?? null} icon="🧠" color="blue" index={2} />
        <RiskCard label="Hypertension" value={risks?.hypertension ?? null} icon="💢" color="purple" index={3} />
      </div>

      {/* Health Score Banner */}
      {healthScore && (
        <motion.div 
          className={`rounded-2xl p-6 flex items-center gap-6 border backdrop-blur-sm ${
            healthScore.color === 'green'  ? 'bg-gradient-to-r from-green-50/80 to-emerald-50/80 border-green-200' :
            healthScore.color === 'yellow' ? 'bg-gradient-to-r from-yellow-50/80 to-amber-50/80 border-yellow-200' :
            healthScore.color === 'orange' ? 'bg-gradient-to-r from-orange-50/80 to-amber-50/80 border-orange-200' :
                                             'bg-gradient-to-r from-red-50/80 to-rose-50/80 border-red-200'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.01 }}
        >
          <HealthScoreRing score={healthScore.score} color={healthScore.color} label="Score" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <p className="font-bold text-gray-900 text-xl">Health Score: {healthScore.label}</p>
              <Link to="/app/wellness" className="text-xs bg-white/80 backdrop-blur border border-gray-200 text-gray-600 px-4 py-1.5 rounded-full hover:bg-white transition-all shadow-sm">
                View Full Plan →
              </Link>
            </div>
            <p className="text-sm text-gray-600">{healthScore.improvement_tips[0]}</p>
          </div>
        </motion.div>
      )}

      {/* BMI Banner */}
      {risks?.bmi && (
        <motion.div 
          className={`rounded-2xl p-5 flex items-center gap-4 border ${
            risks.bmi < 18.5 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' :
            risks.bmi < 25   ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' :
            risks.bmi < 30   ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' :
                               'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
          }`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.01 }}
        >
          <motion.span 
            className="text-4xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ⚖️
          </motion.span>
          <div>
            <p className="font-bold text-gray-800 text-lg">BMI: {risks.bmi}</p>
            <p className="text-sm text-gray-600">
              {risks.bmi < 18.5 ? 'Underweight — consider a nutrition plan' :
               risks.bmi < 25   ? 'Healthy weight — keep it up!' :
               risks.bmi < 30   ? 'Overweight — diet & exercise recommended' :
                                  'Obese — please consult a doctor'}
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <motion.div 
          className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          whileHover={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)' }}
        >
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl">📈</span>
            Risk Trend History
          </h2>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="heartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="diabetesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    fontSize: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                  }}
                  formatter={(v) => `${v}%`}
                />
                <Area type="monotone" dataKey="Heart" stroke="#f87171" strokeWidth={2} fill="url(#heartGrad)" />
                <Area type="monotone" dataKey="Diabetes" stroke="#fbbf24" strokeWidth={2} fill="url(#diabetesGrad)" />
                <Line type="monotone" dataKey="Stroke" stroke="#60a5fa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Hypertension" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm flex-col gap-3">
              <motion.span 
                className="text-5xl"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                📊
              </motion.span>
              <p>Run risk analysis a few times to see trends here</p>
            </div>
          )}
        </motion.div>

        {/* Alerts */}
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="text-xl">🔔</span>
              Recent Alerts
            </h2>
            <Link to="/app/alerts" className="text-xs text-green-600 font-semibold hover:underline">View all</Link>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              <motion.div 
                className="text-4xl mb-3"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✅
              </motion.div>
              No new alerts
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <motion.div 
                  key={alert.id} 
                  className={`rounded-xl p-4 text-sm border ${
                    alert.severity === 'danger'  ? 'bg-red-50 border-red-100 text-red-700' :
                    alert.severity === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                                   'bg-green-50 border-green-100 text-green-700'
                  }`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="leading-relaxed">{alert.message}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recommendations */}
      {recs && (
        <motion.div 
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="text-xl">💡</span>
            Personalized Recommendations
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: '🥗 Diet', items: recs.diet?.slice(0, 3) || [], color: 'from-green-50 to-emerald-50 border-green-100' },
              { title: '🏃 Exercise', items: recs.exercise?.slice(0, 3) || [], color: 'from-blue-50 to-indigo-50 border-blue-100' },
              { title: '🌿 Lifestyle', items: recs.lifestyle?.slice(0, 3) || [], color: 'from-purple-50 to-violet-50 border-purple-100' },
              { title: '🩺 Preventive', items: recs.preventive_care?.slice(0, 3) || [], color: 'from-amber-50 to-yellow-50 border-amber-100' },
            ].map((section, i) => (
              <motion.div 
                key={section.title} 
                className={`bg-gradient-to-br ${section.color} rounded-xl p-5 border`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + i * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
              >
                <p className="font-bold text-gray-800 text-sm mb-3">{section.title}</p>
                {section.items.length > 0 ? (
                  <ul className="space-y-2">
                    {section.items.map((item, j) => (
                      <motion.li 
                        key={j} 
                        className="text-xs text-gray-600 flex gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + i * 0.1 + j * 0.05 }}
                      >
                        <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">Complete your health profile to get recommendations</p>
                )}
              </motion.div>
            ))}
          </div>
          {recs.doctor_consultation?.[0] && (
            <motion.div 
              className={`mt-5 rounded-xl p-5 border ${
                recs.doctor_consultation[0].urgency === 'HIGH'   ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200' :
                recs.doctor_consultation[0].urgency === 'MEDIUM' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' :
                                                                    'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              whileHover={{ scale: 1.01 }}
            >
              <p className="text-sm font-semibold text-gray-800">{recs.doctor_consultation[0].message}</p>
              <p className="text-xs text-gray-500 mt-1">Suggested: {recs.doctor_consultation[0].specialist}</p>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.div 
        className="bg-amber-50/80 backdrop-blur-sm border border-amber-100 rounded-2xl px-6 py-4 text-xs text-amber-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        ⚠️ <strong>Disclaimer:</strong> Risk predictions are for informational purposes only and do not constitute medical diagnosis. Always consult a qualified healthcare professional for medical advice.
      </motion.div>
    </motion.div>
  )
}