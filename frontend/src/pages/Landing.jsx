import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

// Animated 3D Floating Elements
function FloatingElements() {
  const elements = [
    { icon: '💊', size: 'text-4xl', top: '15%', left: '8%', delay: 0 },
    { icon: '🩺', size: 'text-5xl', top: '20%', right: '10%', delay: 0.5 },
    { icon: '❤️', size: 'text-3xl', top: '60%', left: '5%', delay: 1 },
    { icon: '🧬', size: 'text-4xl', bottom: '25%', right: '8%', delay: 1.5 },
    { icon: '🫀', size: 'text-5xl', top: '40%', left: '3%', delay: 0.8 },
    { icon: '🧠', size: 'text-3xl', bottom: '15%', left: '12%', delay: 1.2 },
    { icon: '💉', size: 'text-4xl', top: '30%', right: '5%', delay: 0.3 },
    { icon: '🏥', size: 'text-3xl', bottom: '30%', right: '15%', delay: 2 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {elements.map((el, i) => (
        <motion.div
          key={i}
          className={`absolute ${el.size} opacity-20 select-none`}
          style={{ top: el.top, left: el.left, right: el.right, bottom: el.bottom }}
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ 
            opacity: 0.15, 
            scale: 1, 
            rotate: 0,
            y: [0, -25, 0],
            x: [0, 10, 0],
          }}
          transition={{
            delay: el.delay,
            duration: 1,
            y: { duration: 4 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 5 + Math.random() * 2, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          {el.icon}
        </motion.div>
      ))}
    </div>
  )
}

// Animated DNA Helix
function DNAHelix() {
  return (
    <div className="relative w-16 h-40">
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full flex justify-between items-center"
          style={{ top: `${i * 10}%` }}
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: i * 0.1 }}
        >
          <motion.div 
            className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-400/50"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          />
          <div className="flex-1 h-0.5 bg-gradient-to-r from-green-300/60 via-emerald-200/40 to-green-300/60 mx-0.5" />
          <motion.div 
            className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-400/50"
            animate={{ scale: [1.3, 1, 1.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          />
        </motion.div>
      ))}
    </div>
  )
}

// Heartbeat Line Animation
function HeartbeatLine() {
  return (
    <svg viewBox="0 0 400 60" className="w-full h-12 opacity-30">
      <motion.path
        d="M0,30 L80,30 L100,30 L110,10 L120,50 L130,20 L140,40 L150,30 L230,30 L250,30 L260,10 L270,50 L280,20 L290,40 L300,30 L400,30"
        fill="none"
        stroke="url(#pulseGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      <defs>
        <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
          <stop offset="50%" stopColor="#22c55e" stopOpacity="1" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Animated Stats Counter
function AnimatedCounter({ value, suffix = '' }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    const num = parseInt(value) || 0
    const duration = 2000
    const steps = 60
    const increment = num / steps
    let current = 0
    
    const timer = setInterval(() => {
      current += increment
      if (current >= num) {
        setCount(num)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    
    return () => clearInterval(timer)
  }, [value])
  
  return <span>{count}{suffix}</span>
}

// Feature Card with 3D hover
function FeatureCard({ icon, title, desc, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ 
        y: -10, 
        rotateX: 5, 
        rotateY: 5,
        boxShadow: '0 25px 50px -12px rgba(34, 197, 94, 0.25)'
      }}
      className="group bg-white/80 backdrop-blur-sm border border-gray-100 rounded-3xl p-7 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <motion.div 
        className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-110 transition-transform duration-300"
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        {icon}
      </motion.div>
      <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-green-700 transition-colors">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  )
}

const features = [
  { icon: '🧠', title: 'AI Risk Prediction', desc: 'Get personalized disease risk scores for heart, diabetes, stroke & more — powered by smart health analytics.' },
  { icon: '📄', title: 'Lab Report Analysis', desc: 'Upload your blood reports. We auto-detect abnormal values and explain what they mean in plain language.' },
  { icon: '🗺️', title: 'Nearby Care Map', desc: 'Locate hospitals, clinics & pharmacies near you. Stay informed about local disease outbreak zones.' },
  { icon: '📊', title: 'Health Dashboard', desc: 'Track your risk trends over time with beautiful charts. Get personalized diet and lifestyle recommendations.' },
  { icon: '🔔', title: 'Smart Alerts', desc: 'Receive timely alerts for high-risk conditions, abnormal report values, and nearby outbreak warnings.' },
  { icon: '🛡️', title: 'Preventive Focus', desc: 'Catch health risks early before they become serious. LifeSet empowers you to act — not react.' },
]

const stats = [
  { val: '4+', label: 'Disease Risks Tracked' },
  { val: '15+', label: 'Health Parameters' },
  { val: '100%', label: 'Private & Secure' },
  { val: 'Free', label: 'Always' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50/80 via-white to-emerald-50/50 font-sans overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-green-200/40 to-emerald-300/30 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 -left-32 w-80 h-80 bg-gradient-to-br from-emerald-200/30 to-teal-300/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 right-1/4 w-72 h-72 bg-gradient-to-br from-green-300/20 to-cyan-200/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.3, 1],
            y: [0, -50, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl border-b border-green-100/50"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div 
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-white text-lg font-bold">L</span>
            </motion.div>
            <span className="font-display text-xl text-green-800 group-hover:text-green-600 transition-colors">LifeSet</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-green-700 transition-colors px-4 py-2 rounded-xl hover:bg-green-50">
              Sign In
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/register" className="text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40">
                Get Started Free
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <FloatingElements />
        
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.span 
                  className="inline-flex items-center gap-2 bg-green-100/80 backdrop-blur text-green-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-green-200/50"
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.span 
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  AI-Powered Preventive Healthcare
                </motion.span>
              </motion.div>
              
              <motion.h1 
                className="text-5xl md:text-6xl lg:text-7xl font-display text-gray-900 leading-[1.1] mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Know Your Health
                <motion.span 
                  className="block bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent"
                  animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  style={{ backgroundSize: '200%' }}
                >
                  Before It's Too Late
                </motion.span>
              </motion.h1>
              
              <motion.p 
                className="text-lg text-gray-500 max-w-lg mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                LifeSet uses AI to analyze your health data, predict disease risks, and deliver personalized preventive care — all in one beautiful platform.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-green-500/30 hover:shadow-green-500/50 text-lg">
                    Start Your Journey
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/login" className="inline-flex items-center justify-center border-2 border-green-200 text-green-700 font-semibold px-8 py-4 rounded-2xl hover:bg-green-50 hover:border-green-300 transition-all text-lg">
                    Sign In
                  </Link>
                </motion.div>
              </motion.div>
            </div>

            {/* Right - 3D Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotateY: -15 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative perspective-1000"
            >
              <motion.div 
                className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 p-6 transform-gpu"
                whileHover={{ rotateY: 5, rotateX: 5, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-3xl blur-xl opacity-20" />
                
                <div className="relative">
                  {/* Mini header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Health Dashboard</span>
                  </div>

                  {/* Risk Cards */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { label: 'Heart Risk', val: 42, color: 'from-red-400 to-rose-500', bg: 'bg-red-50' },
                      { label: 'Diabetes', val: 28, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50' },
                      { label: 'Stroke', val: 18, color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50' },
                      { label: 'BP Risk', val: 55, color: 'from-purple-400 to-violet-500', bg: 'bg-purple-50' },
                    ].map((item, i) => (
                      <motion.div 
                        key={item.label}
                        className={`${item.bg} rounded-2xl p-4 border border-white/50`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                      >
                        <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                        <p className="text-2xl font-bold text-gray-800">{item.val}%</p>
                        <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                          <motion.div 
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.val}%` }}
                            transition={{ delay: 0.8 + i * 0.1, duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Recommendation */}
                  <motion.div 
                    className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💡</span>
                      <div>
                        <p className="text-sm font-semibold text-green-800 mb-1">Today's Recommendation</p>
                        <p className="text-xs text-gray-600">30 min brisk walk + limit sodium to reduce BP risk</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Heartbeat line */}
                  <div className="mt-4">
                    <HeartbeatLine />
                  </div>
                </div>
              </motion.div>

              {/* Floating DNA */}
              <motion.div 
                className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-60"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <DNAHelix />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 relative">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        />
        <div className="max-w-5xl mx-auto px-6 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div 
                key={s.label}
                className="text-center text-white"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <motion.p 
                  className="font-display text-4xl md:text-5xl mb-2"
                  whileHover={{ scale: 1.1 }}
                >
                  {s.val.includes('+') ? <AnimatedCounter value={s.val.replace('+', '')} suffix="+" /> : s.val}
                </motion.p>
                <p className="text-green-100 text-sm">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.span 
              className="inline-block text-green-600 font-semibold text-sm mb-4 tracking-wider uppercase"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Features
            </motion.span>
            <h2 className="font-display text-4xl md:text-5xl text-gray-900 mb-4">
              Everything You Need to
              <span className="block text-green-600">Stay Ahead</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Comprehensive health intelligence designed for prevention — not just treatment.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 bg-amber-50/80 backdrop-blur border-y border-amber-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-amber-800 text-sm">
            ⚠️ <strong>Medical Disclaimer:</strong> LifeSet provides risk predictions and general health guidance only — not medical diagnoses. Always consult a qualified healthcare professional.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-green-700 via-emerald-700 to-teal-800"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        />
        
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ 
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="max-w-2xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-6"
            >
              <span className="text-6xl">🫀</span>
            </motion.div>
            <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
              Your Health Journey Starts Today
            </h2>
            <p className="text-green-100 mb-8 text-lg">
              Join thousands taking control of their preventive health with AI-powered insights.
            </p>
            <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.98 }}>
              <Link to="/register" className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-10 py-4 rounded-2xl shadow-2xl hover:shadow-white/20 transition-all text-lg">
                Create Free Account
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold">L</span>
              </div>
              <span className="font-display text-xl text-white">LifeSet</span>
            </div>
            <p className="text-sm text-center md:text-right">
              © 2025 LifeSet. Built for preventive healthcare.<br />
              Not a substitute for medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}