import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { authAPI } from '../api'
import { useAuth } from '../AuthContext'

// Floating particles
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-green-400/20 rounded-full"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{
            y: [0, -80, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 8,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  )
}

export default function Register() {
  const [step, setStep]   = useState(1)
  const [role, setRole]   = useState('patient')
  const [form, setForm]   = useState({
    name: '', email: '', password: '', phone: '',
    specialization: '', license_number: '', hospital_affiliation: ''
  })
  const [otp, setOtp]             = useState(['', '', '', '', '', ''])
  const [regEmail, setRegEmail]   = useState('')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const inputRefs = useRef([])
  const { login } = useAuth()
  const navigate  = useNavigate()

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setInterval(() => setResendTimer(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [resendTimer])

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res  = await authAPI.register({ ...form, role })
      login(res.data)
      setRegEmail(form.email)
      setResendTimer(60)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally { setLoading(false) }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (newOtp.every(d => d)) handleVerify(newOtp.join(''))
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus()
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code) => {
    const finalCode = code || otp.join('')
    if (finalCode.length !== 6) return
    setError(''); setLoading(true)
    try {
      await authAPI.verifyOtp({ email: regEmail, otp: finalCode })
      setSuccess('✅ Email verified! Welcome to LifeSet!')
      setTimeout(() => navigate('/app'), 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please check your email.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    setError(''); setLoading(true)
    try {
      await authAPI.resendOtp(regEmail)
      setResendTimer(60)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background effects */}
      <motion.div 
        className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-green-200/50 to-emerald-300/40 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-br from-emerald-200/40 to-teal-300/30 rounded-full blur-3xl"
        animate={{ scale: [1.2, 1, 1.2] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <FloatingParticles />

      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo + Steps */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
            <motion.div 
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-500/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <span className="text-white font-bold text-xl">L</span>
            </motion.div>
            <span className="font-display text-2xl text-green-800 group-hover:text-green-600 transition-colors">LifeSet</span>
          </Link>
          
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3">
            {[['1','Create Account'], ['2','Verify Email']].map(([n, lbl], i) => (
              <div key={n} className="flex items-center gap-2">
                {i > 0 && (
                  <motion.div 
                    className={`w-10 h-1 rounded-full ${step >= 2 ? 'bg-green-400' : 'bg-gray-200'}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.3 }}
                  />
                )}
                <motion.div 
                  className={`flex items-center gap-2 text-sm font-semibold ${step >= +n ? 'text-green-700' : 'text-gray-400'}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <motion.span 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${step >= +n ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                    animate={step >= +n ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {step > +n ? '✓' : n}
                  </motion.span>
                  <span className="hidden sm:inline">{lbl}</span>
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-green-900/10 border border-white/50 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Gradient top border */}
          <div className="h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400" />

          <AnimatePresence mode="wait">
            {/* STEP 1 */}
            {step === 1 && (
              <motion.div 
                key="step1"
                className="p-8"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="font-display text-2xl text-gray-900 mb-1">Create your account</h1>
                <p className="text-gray-500 text-sm mb-6">Join LifeSet as a patient or doctor</p>

                {error && (
                  <motion.div 
                    className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5 flex items-center gap-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span>⚠️</span> {error}
                  </motion.div>
                )}

                {/* Role toggle */}
                <div className="flex bg-gray-100 rounded-2xl p-1.5 mb-6 gap-1">
                  {[['patient','🏥','Patient'],['doctor','🩺','Doctor']].map(([r, icon, lbl]) => (
                    <motion.button 
                      key={r} 
                      type="button" 
                      onClick={() => setRole(r)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                        role === r ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25' : 'text-gray-500 hover:text-gray-700'
                      }`}
                      whileHover={{ scale: role === r ? 1 : 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {icon} {lbl}
                    </motion.button>
                  ))}
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                      <input type="text" required value={form.name} onChange={f('name')} 
                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all" 
                        placeholder="Your full name"/>
                    </div>
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                      <input type="email" required value={form.email} onChange={f('email')} 
                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all" 
                        placeholder="you@example.com"/>
                    </div>
                    <p className="text-xs text-green-600 mt-1.5 font-medium flex items-center gap-1">
                      <span>📧</span> A 6-digit OTP will be sent to this email
                    </p>
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📱</span>
                      <input type="tel" value={form.phone} onChange={f('phone')} 
                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all" 
                        placeholder="+91 98765 43210"/>
                    </div>
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                      <input type="password" required minLength={6} value={form.password} onChange={f('password')} 
                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all" 
                        placeholder="Minimum 6 characters"/>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {role === 'doctor' && (
                      <motion.div 
                        className="space-y-4 pt-4 border-t border-gray-100"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-2">
                          <span>🩺</span> Doctor Details
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Specialization</label>
                            <input type="text" value={form.specialization} onChange={f('specialization')} 
                              className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all" 
                              placeholder="e.g. Cardiologist"/>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">License No.</label>
                            <input type="text" value={form.license_number} onChange={f('license_number')} 
                              className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all" 
                              placeholder="MCI-XXXXX"/>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Hospital / Clinic</label>
                          <input type="text" value={form.hospital_affiliation} onChange={f('hospital_affiliation')} 
                            className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 focus:bg-white transition-all" 
                            placeholder="Apollo Hospital, Mumbai"/>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 text-sm mt-2 flex items-center justify-center gap-2 relative overflow-hidden group"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {loading ? (
                      <>
                        <motion.span 
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create {role === 'doctor' ? 'Doctor' : 'Patient'} Account
                        <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.span>
                      </>
                    )}
                  </motion.button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                  Already have an account?{' '}
                  <Link to="/login" className="text-green-600 font-semibold hover:text-green-700 hover:underline transition-colors">Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* STEP 2: OTP */}
            {step === 2 && (
              <motion.div 
                key="step2"
                className="p-8"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <motion.div 
                    className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-5 shadow-lg"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    📧
                  </motion.div>
                  <h1 className="font-display text-2xl text-gray-900">Check your email</h1>
                  <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                    We sent a 6-digit verification code to<br/>
                    <span className="font-bold text-green-700">{regEmail}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Check your inbox and spam folder</p>
                </div>

                {error && (
                  <motion.div 
                    className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5 text-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ⚠️ {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-5 text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    {success}
                  </motion.div>
                )}

                {/* OTP boxes */}
                <div className="flex gap-3 justify-center mb-8" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <motion.input 
                      key={i}
                      ref={el => inputRefs.current[i] = el}
                      type="text" 
                      inputMode="numeric" 
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all
                        ${digit ? 'border-green-500 bg-green-50 text-green-800 shadow-lg shadow-green-500/20' : 'border-gray-200 bg-gray-50 text-gray-800'}
                        focus:border-green-500 focus:bg-green-50 focus:shadow-lg focus:shadow-green-500/20`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    />
                  ))}
                </div>

                <motion.button
                  onClick={() => handleVerify()}
                  disabled={otp.join('').length !== 6 || loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-green-500/30 text-sm flex items-center justify-center gap-2 mb-6"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <>
                      <motion.span 
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      Verifying...
                    </>
                  ) : (
                    <>✅ Verify Email & Continue</>
                  )}
                </motion.button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-500">Didn't receive the email?</p>
                  {resendTimer > 0 ? (
                    <p className="text-sm text-gray-400">
                      Resend in <span className="font-bold text-green-600">{resendTimer}s</span>
                    </p>
                  ) : (
                    <motion.button 
                      onClick={handleResend} 
                      disabled={loading}
                      className="text-sm font-semibold text-green-600 hover:text-green-700 hover:underline transition"
                      whileHover={{ scale: 1.05 }}
                    >
                      Resend OTP →
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Bottom decoration */}
        <motion.div 
          className="flex justify-center mt-8 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {['💊', '🩺', '❤️', '🧬', '🫀'].map((emoji, i) => (
            <motion.span 
              key={i}
              className="text-2xl opacity-30"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
            >
              {emoji}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}