import { motion } from 'framer-motion'

// Floating 3D Health Icons
export function FloatingHealthIcons() {
  const icons = [
    { emoji: '💊', delay: 0, x: '10%', y: '20%' },
    { emoji: '🩺', delay: 0.5, x: '85%', y: '15%' },
    { emoji: '❤️', delay: 1, x: '75%', y: '70%' },
    { emoji: '🧬', delay: 1.5, x: '15%', y: '75%' },
    { emoji: '🏥', delay: 2, x: '50%', y: '10%' },
    { emoji: '💉', delay: 0.3, x: '90%', y: '45%' },
    { emoji: '🫀', delay: 0.8, x: '5%', y: '50%' },
    { emoji: '🧠', delay: 1.2, x: '60%', y: '85%' },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl opacity-20"
          style={{ left: icon.x, top: icon.y }}
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ 
            opacity: 0.15, 
            scale: 1, 
            rotate: 0,
            y: [0, -20, 0],
          }}
          transition={{
            delay: icon.delay,
            duration: 0.8,
            y: {
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
        >
          {icon.emoji}
        </motion.div>
      ))}
    </div>
  )
}

// Animated DNA Helix
export function DNAHelix({ className = '' }) {
  const strands = Array.from({ length: 12 }, (_, i) => i)
  
  return (
    <div className={`relative w-20 h-48 ${className}`}>
      {strands.map((i) => (
        <motion.div
          key={i}
          className="absolute w-full flex justify-between items-center"
          style={{ top: `${i * 8}%` }}
          animate={{
            rotateY: [0, 360],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.1,
          }}
        >
          <motion.div 
            className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-400/50"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          />
          <div className="flex-1 h-0.5 bg-gradient-to-r from-green-300 via-emerald-200 to-green-300 mx-1 opacity-60" />
          <motion.div 
            className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-400/50"
            animate={{ scale: [1.2, 1, 1.2] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          />
        </motion.div>
      ))}
    </div>
  )
}

// Animated Heartbeat Line
export function HeartbeatLine({ className = '' }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg viewBox="0 0 400 100" className="w-full h-full">
        <motion.path
          d="M0,50 L50,50 L70,50 L80,20 L90,80 L100,30 L110,70 L120,50 L150,50 L170,50 L180,20 L190,80 L200,30 L210,70 L220,50 L250,50 L270,50 L280,20 L290,80 L300,30 L310,70 L320,50 L400,50"
          fill="none"
          stroke="url(#heartGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <defs>
          <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="50%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// Pulsing Health Ring
export function PulsingRing({ value = 75, color = 'green', size = 120 }) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference * (1 - value / 100)
  
  const colors = {
    green: { stroke: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' },
    red: { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
    yellow: { stroke: '#eab308', glow: 'rgba(234, 179, 8, 0.4)' },
    blue: { stroke: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  }
  
  const c = colors[color] || colors.green

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        {/* Background ring */}
        <circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-200"
        />
        {/* Animated progress ring */}
        <motion.circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={c.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${c.glow})` }}
        />
        {/* Pulsing glow */}
        <motion.circle
          cx="50" cy="50" r="45"
          fill="none"
          stroke={c.stroke}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ filter: `blur(4px)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span 
          className="text-2xl font-bold text-gray-800"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          {value}
        </motion.span>
      </div>
    </div>
  )
}

// Floating Particles Background
export function ParticleBackground({ count = 50 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-green-400/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  )
}

// 3D Card with Tilt Effect
export function Card3D({ children, className = '' }) {
  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ 
        scale: 1.02,
        rotateX: 5,
        rotateY: 5,
      }}
      transition={{ type: "spring", stiffness: 300 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  )
}

// Animated Counter
export function AnimatedCounter({ value, suffix = '', className = '' }) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {value}{suffix}
      </motion.span>
    </motion.span>
  )
}

// Glowing Button
export function GlowButton({ children, onClick, className = '', variant = 'primary' }) {
  const variants = {
    primary: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/30',
    secondary: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/30',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/30',
  }

  return (
    <motion.button
      onClick={onClick}
      className={`relative px-6 py-3 rounded-2xl text-white font-semibold shadow-lg ${variants[variant]} ${className}`}
      whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(34, 197, 94, 0.3)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <motion.span
        className="absolute inset-0 rounded-2xl bg-white/20"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

// Animated List Item
export function AnimatedListItem({ children, index = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}

// Morphing Blob Background
export function MorphingBlob({ className = '' }) {
  return (
    <motion.div
      className={`absolute rounded-full bg-gradient-to-br from-green-300/30 to-emerald-400/30 blur-3xl ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 180, 360],
        borderRadius: ['30% 70% 70% 30% / 30% 30% 70% 70%', '70% 30% 30% 70% / 70% 70% 30% 30%', '30% 70% 70% 30% / 30% 30% 70% 70%'],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  )
}

// Staggered Container for animations
export function StaggerContainer({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      {children}
    </motion.div>
  )
}
