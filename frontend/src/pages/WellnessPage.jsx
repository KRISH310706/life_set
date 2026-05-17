import { useState, useEffect } from 'react'
import { wellnessAPI } from '../api'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import LanguageSelector from '../components/LanguageSelector'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

// Simple text component - no API translation, just displays text
function T({ children, text }) {
  return <span>{text || children}</span>
}

// Period Care Tab Component
function PeriodCareTab({ periodCare, activeVideo, setActiveVideo }) {
  const [subTab, setSubTab] = useState('diet')
  
  if (!periodCare) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500"><T text="Loading period care information..." /></p>
      </div>
    )
  }

  const subTabs = [
    { id: 'diet', label: 'Diet Plan', emoji: '🥗' },
    { id: 'exercises', label: 'Exercises', emoji: '🧘' },
    { id: 'pain', label: 'Pain Relief', emoji: '💆' },
    { id: 'medicine', label: 'Medicine', emoji: '💊' },
    { id: 'tips', label: 'Self Care', emoji: '💚' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🌸</span>
          <div>
            <h2 className="font-bold text-xl"><T text={periodCare.title} /></h2>
            <p className="text-pink-100 text-sm mt-1"><T text={periodCare.description} /></p>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              subTab === t.id ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}>
            <span>{t.emoji}</span> <T text={t.label} />
          </button>
        ))}
      </div>

      {/* Diet Plan Sub Tab */}
      {subTab === 'diet' && periodCare.diet_plan && (
        <div className="space-y-5">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <h3 className="font-semibold text-green-800 mb-2">🥗 <T text={periodCare.diet_plan.title} /></h3>
            <p className="text-sm text-green-700"><T text={periodCare.diet_plan.description} /></p>
          </div>

          {/* Foods to Eat */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {periodCare.diet_plan.foods_to_eat?.map((category, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{category.emoji}</span>
                  <h4 className="font-semibold text-gray-900 text-sm"><T text={category.category} /></h4>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {category.items.map((item, j) => (
                    <span key={j} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200"><T text={item} /></span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 italic">💡 <T text={category.reason} /></p>
              </div>
            ))}
          </div>

          {/* Foods to Avoid */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <h4 className="font-semibold text-red-800 mb-3"><T text="🚫 Foods to Avoid" /></h4>
            <div className="grid md:grid-cols-2 gap-3">
              {periodCare.diet_plan.foods_to_avoid?.map((item, i) => (
                <div key={i} className="flex items-start gap-2 bg-white rounded-xl p-3 border border-red-100">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm"><T text={item.item} /></p>
                    <p className="text-xs text-gray-500"><T text={item.reason} /></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Meals */}
          {periodCare.diet_plan.sample_meals && (
            <div className="grid md:grid-cols-2 gap-4">
              <MealCard title="Breakfast" emoji="🌅" items={periodCare.diet_plan.sample_meals.breakfast} />
              <MealCard title="Lunch" emoji="☀️" items={periodCare.diet_plan.sample_meals.lunch} />
              <MealCard title="Dinner" emoji="🌙" items={periodCare.diet_plan.sample_meals.dinner} />
              <MealCard title="Snacks" emoji="🍎" items={periodCare.diet_plan.sample_meals.snacks} />
            </div>
          )}
        </div>
      )}

      {/* Exercises Sub Tab */}
      {subTab === 'exercises' && periodCare.exercises && (
        <div className="space-y-5">
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <h3 className="font-semibold text-purple-800 mb-2">🧘 {periodCare.exercises.title}</h3>
            <p className="text-sm text-purple-700">{periodCare.exercises.description}</p>
            <p className="text-sm text-purple-600 mt-2 font-medium">💜 {periodCare.exercises.important_note}</p>
          </div>

          {/* Exercise Cards with Videos */}
          <div className="grid md:grid-cols-2 gap-4">
            {periodCare.exercises.recommended?.map((exercise, i) => (
              <div key={i} className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{exercise.name}</h4>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">⏱ {exercise.duration}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{exercise.intensity}</span>
                    </div>
                  </div>
                  {exercise.video && (
                    <button onClick={() => setActiveVideo(exercise.video)}
                      className="w-10 h-10 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full flex items-center justify-center transition-colors">
                      ▶️
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.benefits?.map((benefit, j) => (
                    <span key={j} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">✓ {benefit}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Exercises to Avoid */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h4 className="font-semibold text-amber-800 mb-2">⚠️ Exercises to Avoid During Periods</h4>
            <div className="flex flex-wrap gap-2">
              {periodCare.exercises.exercises_to_avoid?.map((item, i) => (
                <span key={i} className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200">✕ {item}</span>
              ))}
            </div>
          </div>

          {/* Video Library */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">🎬 Period Care Video Library</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {periodCare.all_videos && Object.entries(periodCare.all_videos).map(([key, video]) => (
                <VideoCard key={key} video={video} onPlay={() => setActiveVideo(video)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pain Relief Sub Tab */}
      {subTab === 'pain' && periodCare.pain_relief && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💆 {periodCare.pain_relief.title}</h3>
            <p className="text-sm text-blue-700">{periodCare.pain_relief.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {periodCare.pain_relief.methods?.map((method, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{method.emoji}</span>
                  <h4 className="font-semibold text-gray-900">{method.name}</h4>
                </div>
                <div className="space-y-2">
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-green-700 mb-1">How to do it:</p>
                    <p className="text-sm text-green-800">{method.how}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Why it works:</p>
                    <p className="text-sm text-blue-800">{method.why}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medicine Sub Tab */}
      {subTab === 'medicine' && periodCare.medicine_suggestions && (
        <div className="space-y-5">
          {/* Important Warning */}
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="font-bold text-red-800 mb-2">Important Warning</h3>
                <p className="text-sm text-red-700">{periodCare.medicine_suggestions.important_warning}</p>
              </div>
            </div>
          </div>

          {/* When to Consult Doctor */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h4 className="font-semibold text-amber-800 mb-3">🩺 Consult a Doctor If:</h4>
            <ul className="space-y-2">
              {periodCare.medicine_suggestions.consult_doctor_if?.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                  <span className="text-amber-500 mt-0.5">→</span> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* OTC Options */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4">💊 Common OTC Options (Consult Doctor First)</h4>
            <div className="space-y-4">
              {periodCare.medicine_suggestions.common_otc_options?.map((med, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-semibold text-gray-800">{med.name}</h5>
                      <p className="text-xs text-gray-500">{med.type}</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">⚕️ {med.doctor_approval}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">✓ {med.how_it_helps}</p>
                  <p className="text-xs text-gray-500 italic">📝 {med.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Supplements */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <h4 className="font-semibold text-green-800 mb-3">🌿 Helpful Supplements</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {periodCare.medicine_suggestions.supplements?.map((supp, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-green-100">
                  <p className="font-medium text-gray-800 text-sm">{supp.name}</p>
                  <p className="text-xs text-gray-500">Dosage: {supp.dosage}</p>
                  <p className="text-xs text-green-600 mt-1">✓ {supp.benefit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Urgent Signs */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <h4 className="font-semibold text-red-800 mb-3">🚨 See Doctor Urgently If:</h4>
            <div className="flex flex-wrap gap-2">
              {periodCare.medicine_suggestions.when_to_see_doctor_urgently?.map((item, i) => (
                <span key={i} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full border border-red-200">⚠️ {item}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Self Care Tips Sub Tab */}
      {subTab === 'tips' && periodCare.self_care_tips && (
        <div className="space-y-5">
          <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4">
            <h3 className="font-semibold text-pink-800 mb-2">💚 {periodCare.self_care_tips.title}</h3>
            <p className="text-sm text-pink-700">Take care of yourself during your period. You deserve it! 💕</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {periodCare.self_care_tips.tips?.map((item, i) => (
              <div key={i} className="bg-white border border-pink-100 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <span className="text-3xl">{item.emoji}</span>
                <p className="text-sm text-gray-700 font-medium">{item.tip}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl p-6 text-center">
            <span className="text-5xl mb-3 block">🌸</span>
            <p className="text-lg font-semibold text-gray-800 mb-2">Remember</p>
            <p className="text-gray-600">Your period is a natural part of life. Be gentle with yourself, rest when you need to, and don't hesitate to seek help if something doesn't feel right. 💜</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function HealthScoreRing({ score, color, label }) {
  const r = 52, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const strokeColor = color === 'green' ? '#22c55e' : color === 'yellow' ? '#eab308' : color === 'orange' ? '#f97316' : '#ef4444'

  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12"/>
        <circle cx="65" cy="65" r={r} fill="none"
          stroke={strokeColor} strokeWidth="12"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)' }}
        />
        <text x="65" y="60" textAnchor="middle" fontSize="26" fontWeight="800" fill="#1e293b">{score}</text>
        <text x="65" y="78" textAnchor="middle" fontSize="11" fill="#94a3b8">/ 100</text>
      </svg>
      <p className="font-bold text-lg text-gray-900 -mt-1">{label}</p>
    </div>
  )
}

function MealCard({ title, emoji, items }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl flex-shrink-0">{emoji}</span>
        <h3 className="font-semibold text-gray-900 truncate"><T>{title}</T></h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
            <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i+1}</span>
            <span className="break-words overflow-hidden"><T>{item}</T></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function VideoCard({ video, title, onPlay }) {
  if (!video) return null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative cursor-pointer group" onClick={onPlay}>
        <img 
          src={video.thumbnail} 
          alt={title || video.title}
          className="w-full h-40 object-cover"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <span className="text-2xl ml-1">▶️</span>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {video.duration}
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 text-sm">{title || video.title}</h4>
        {video.calories && <p className="text-xs text-green-600 mt-1">🔥 {video.calories}</p>}
      </div>
    </div>
  )
}

function VideoModal({ video, onClose }) {
  if (!video) return null
  
  // Ensure video URL is in embed format
  let embedUrl = video.video_url
  if (embedUrl.includes('watch?v=')) {
    embedUrl = embedUrl.replace('watch?v=', 'embed/')
  }
  if (!embedUrl.includes('?')) {
    embedUrl += '?autoplay=1&rel=0'
  } else if (!embedUrl.includes('autoplay')) {
    embedUrl += '&autoplay=1&rel=0'
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xl transition-colors"
        >
          ✕
        </button>
        
        <div className="aspect-video bg-black">
          <iframe 
            src={embedUrl}
            title={video.title}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-xl text-gray-900">{video.title}</h3>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">⏱ {video.duration}</span>
              {video.calories && <span className="text-sm bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-medium">🔥 {video.calories}</span>}
              {video.reps && <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-medium">🔄 {video.reps}</span>}
              {video.benefit && <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full font-medium">✨ {video.benefit}</span>}
            </div>
          </div>
          
          {video.instructions && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-3">📋 Instructions:</h4>
              <ol className="space-y-2">
                {video.instructions.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function ExerciseDayCard({ day, activity, duration, intensity, video, reps, onPlayVideo }) {
  const intensityColor = {
    'Very Light': 'bg-blue-50 text-blue-600 border-blue-100',
    'Light':      'bg-green-50 text-green-600 border-green-100',
    'Moderate':   'bg-yellow-50 text-yellow-600 border-yellow-100',
    'High':       'bg-red-50 text-red-600 border-red-100',
    'Rest':       'bg-gray-50 text-gray-600 border-gray-100',
  }[intensity] || 'bg-gray-50 text-gray-600 border-gray-100'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-4">
        <div className="w-14 text-center flex-shrink-0">
          <p className="text-xs font-bold text-gray-400 uppercase">{day.slice(0,3)}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{activity}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">⏱ {duration}</span>
            {reps && <span className="text-xs text-gray-400">• {reps}</span>}
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${intensityColor}`}>{intensity}</span>
        {video && (
          <button 
            onClick={() => onPlayVideo(video)}
            className="w-10 h-10 bg-green-100 hover:bg-green-200 text-green-700 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          >
            ▶️
          </button>
        )}
      </div>
    </div>
  )
}

function DietPlannerForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    age: 25,
    weight: 70,
    height: 170,
    gender: 'male',
    goal: 'maintain',
    activity_level: 'moderate',
    diet_preference: 'mixed',
    health_conditions: []
  })

  const conditions = ['Diabetes', 'High Cholesterol', 'Thyroid', 'Kidney Issues', 'Heart Disease']

  const toggleCondition = (cond) => {
    setForm(f => ({
      ...f,
      health_conditions: f.health_conditions.includes(cond) 
        ? f.health_conditions.filter(c => c !== cond)
        : [...f.health_conditions, cond]
    }))
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="text-center">
        <h3 className="font-bold text-xl text-gray-900">🎯 Custom Diet Planner</h3>
        <p className="text-gray-500 text-sm mt-1">Get a personalized diet and exercise plan based on your goals</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
          <input type="number" value={form.age} onChange={e => setForm({...form, age: +e.target.value})}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-green-400 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-green-400 focus:border-transparent">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
          <input type="number" value={form.weight} onChange={e => setForm({...form, weight: +e.target.value})}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-green-400 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
          <input type="number" value={form.height} onChange={e => setForm({...form, height: +e.target.value})}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-green-400 focus:border-transparent" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">🎯 Your Goal</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'lose', label: 'Lose Weight', emoji: '📉', color: 'red' },
            { id: 'maintain', label: 'Maintain', emoji: '⚖️', color: 'blue' },
            { id: 'gain', label: 'Gain Muscle', emoji: '💪', color: 'green' },
          ].map(g => (
            <button key={g.id} onClick={() => setForm({...form, goal: g.id})}
              className={`p-4 rounded-xl border-2 transition-all ${form.goal === g.id 
                ? `border-${g.color}-500 bg-${g.color}-50` 
                : 'border-gray-200 hover:border-gray-300'}`}>
              <span className="text-2xl block mb-1">{g.emoji}</span>
              <span className="text-sm font-medium">{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">🏃 Activity Level</label>
        <select value={form.activity_level} onChange={e => setForm({...form, activity_level: e.target.value})}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-green-400 focus:border-transparent">
          <option value="sedentary">Sedentary (little or no exercise)</option>
          <option value="light">Light (exercise 1-3 days/week)</option>
          <option value="moderate">Moderate (exercise 3-5 days/week)</option>
          <option value="active">Active (exercise 6-7 days/week)</option>
          <option value="very_active">Very Active (hard exercise daily)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">🥗 Diet Preference</label>
        <div className="flex gap-3">
          {['mixed', 'vegetarian', 'vegan'].map(d => (
            <button key={d} onClick={() => setForm({...form, diet_preference: d})}
              className={`px-4 py-2 rounded-xl border-2 capitalize transition-all ${form.diet_preference === d 
                ? 'border-green-500 bg-green-50 text-green-700' 
                : 'border-gray-200 hover:border-gray-300'}`}>
              {d === 'mixed' ? '🍗 ' : d === 'vegetarian' ? '🥬 ' : '🌱 '}{d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">⚕️ Health Conditions (if any)</label>
        <div className="flex flex-wrap gap-2">
          {conditions.map(c => (
            <button key={c} onClick={() => toggleCondition(c)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${form.health_conditions.includes(c)
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-gray-200 hover:border-gray-300'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => onSubmit(form)} disabled={loading}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? (
          <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
        ) : (
          <>✨ Generate My Plan</>
        )}
      </button>
    </div>
  )
}


function CustomPlanResults({ plan }) {
  const [activeVideo, setActiveVideo] = useState(null)
  
  if (!plan) return null

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Stats Overview */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">🎯</span>
          <div>
            <h3 className="font-bold text-xl">{plan.goal}</h3>
            <p className="text-green-100">Personalized plan based on your profile</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{plan.user_stats.bmi}</p>
            <p className="text-xs text-green-100">BMI ({plan.user_stats.bmi_category})</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{plan.nutrition.target_calories}</p>
            <p className="text-xs text-green-100">Daily Calories</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{plan.nutrition.protein_g}g</p>
            <p className="text-xs text-green-100">Protein</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{plan.user_stats.tdee}</p>
            <p className="text-xs text-green-100">TDEE (kcal)</p>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h4 className="font-semibold text-gray-900 mb-4">📊 Daily Macronutrients</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-2">
              <span className="text-2xl">🥩</span>
            </div>
            <p className="font-bold text-lg">{plan.nutrition.protein_g}g</p>
            <p className="text-xs text-gray-500">Protein ({plan.nutrition.protein_percent}%)</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-2">
              <span className="text-2xl">🍚</span>
            </div>
            <p className="font-bold text-lg">{plan.nutrition.carbs_g}g</p>
            <p className="text-xs text-gray-500">Carbs ({plan.nutrition.carbs_percent}%)</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-yellow-100 flex items-center justify-center mb-2">
              <span className="text-2xl">🥑</span>
            </div>
            <p className="font-bold text-lg">{plan.nutrition.fat_g}g</p>
            <p className="text-xs text-gray-500">Fat ({plan.nutrition.fat_percent}%)</p>
          </div>
        </div>
      </div>

      {/* Meal Plan */}
      <div className="grid md:grid-cols-2 gap-4">
        <MealCard title="Breakfast" emoji="🌅" items={plan.meal_plan.breakfast} />
        <MealCard title="Lunch" emoji="☀️" items={plan.meal_plan.lunch} />
        <MealCard title="Dinner" emoji="🌙" items={plan.meal_plan.dinner} />
        <MealCard title="Snacks" emoji="🍎" items={plan.meal_plan.snacks} />
      </div>

      {/* Exercise Plan with Videos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h4 className="font-semibold text-gray-900 mb-4">🏋️ Exercise Plan with Video Guides</h4>
        <div className="space-y-3">
          {plan.weekly_schedule?.map((day, i) => (
            <ExerciseDayCard 
              key={i} 
              {...day} 
              onPlayVideo={setActiveVideo}
            />
          ))}
        </div>
      </div>

      {/* Exercise Type Cards */}
      {plan.exercise_plan && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(plan.exercise_plan).filter(([k, v]) => v && typeof v === 'object' && v.type).map(([key, ex]) => (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 capitalize">{key.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">{ex.type}</p>
                </div>
                {ex.video && (
                  <button onClick={() => setActiveVideo(ex.video)}
                    className="w-10 h-10 bg-green-100 hover:bg-green-200 text-green-700 rounded-full flex items-center justify-center">
                    ▶️
                  </button>
                )}
              </div>
              <div className="flex gap-2 text-xs">
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">⏱ {ex.duration}</span>
                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full">📅 {ex.frequency}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="bg-green-50 rounded-2xl p-5">
        <h4 className="font-semibold text-green-800 mb-3">💡 Tips for Success</h4>
        <ul className="space-y-2">
          {plan.tips?.map((tip, i) => (
            <li key={i} className="text-sm text-green-900 flex items-start gap-2">
              <span className="text-green-500 mt-0.5">→</span> {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Special Notes */}
      {plan.special_notes?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h4 className="font-semibold text-amber-800 mb-3">⚕️ Health Condition Notes</h4>
          {plan.special_notes.map((note, i) => (
            <p key={i} className="text-sm text-amber-900 mb-2">{note}</p>
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
      </AnimatePresence>
    </div>
  )
}

export default function WellnessPage() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const [healthScore, setHealthScore] = useState(null)
  const [dietPlan, setDietPlan] = useState(null)
  const [exercisePlan, setExercisePlan] = useState(null)
  const [periodCare, setPeriodCare] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('score')
  const [activeVideo, setActiveVideo] = useState(null)
  const [customPlan, setCustomPlan] = useState(null)
  const [customLoading, setCustomLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([
      wellnessAPI.healthScore(user.user_id),
      wellnessAPI.dietPlan(user.user_id),
      wellnessAPI.enhancedExercisePlan(user.user_id),
      wellnessAPI.periodCare(),
    ]).then(([s, d, e, p]) => {
      setHealthScore(s.data)
      setDietPlan(d.data)
      setExercisePlan(e.data)
      setPeriodCare(p.data)
    }).finally(() => setLoading(false))
  }, [user])

  const handleCustomPlan = async (formData) => {
    setCustomLoading(true)
    try {
      const res = await wellnessAPI.customDietPlan(formData)
      setCustomPlan(res.data)
      setTab('custom-result')
    } catch (err) {
      console.error(err)
    } finally {
      setCustomLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="skeleton h-8 w-64 mb-6 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'score', label: 'Health Score', emoji: '📊' },
    { id: 'diet', label: 'Diet Plan', emoji: '🥗' },
    { id: 'exercise', label: 'Exercise', emoji: '🏃' },
    { id: 'yoga', label: 'Yoga', emoji: '🧘' },
    { id: 'periods', label: 'Period Care', emoji: '🌸' },
    { id: 'planner', label: 'Diet Planner', emoji: '🎯' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl text-gray-900"><T text="Diet & Fitness Center" /> 🏋️</h1>
          <p className="text-gray-500 mt-1"><T text="Personalized plans with video guides based on your health profile" /></p>
        </div>
        <LanguageSelector compact />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id || (t.id === 'planner' && tab === 'custom-result')
                ? 'bg-green-600 text-white shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}>
            <span>{t.emoji}</span> <T text={t.label} />
          </button>
        ))}
      </div>

      {/* Health Score Tab */}
      {tab === 'score' && healthScore && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <HealthScoreRing score={healthScore.score} color={healthScore.color} label={healthScore.label} />
              <div className="flex-1">
                <h2 className="font-display text-2xl text-gray-900 mb-2"><T text="Your Overall Health Score" /></h2>
                <p className="text-gray-500 text-sm mb-4">
                  <T text="Based on your lifestyle habits, risk levels, BMI, and clinical readings." />
                </p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold mb-4 ${
                  healthScore.color === 'green' ? 'bg-green-100 text-green-700' :
                  healthScore.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                  healthScore.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {healthScore.color === 'green' ? '✅' : healthScore.color === 'yellow' ? '⚡' : '⚠️'}
                  <T text={`${healthScore.label} Health`} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700 mb-2">💡 Ways to improve:</p>
                  {healthScore.improvement_tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">→</span> {tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Diet Plan Tab */}
      {tab === 'diet' && dietPlan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {dietPlan.report_based && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🧬</span>
              <div>
                <p className="font-semibold text-blue-800 text-sm">Personalized from Your Lab Reports</p>
                <p className="text-xs text-blue-600 mt-0.5">This diet plan has been adjusted based on conditions detected in your uploaded lab reports.</p>
              </div>
            </div>
          )}

          {dietPlan.special_notes?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="font-semibold text-amber-800 text-sm mb-2">⚕️ Condition-Specific Dietary Notes</p>
              {dietPlan.special_notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-900 bg-white rounded-xl px-3 py-2 border border-amber-100">
                  <span className="mt-0.5 flex-shrink-0">→</span> {note}
                </div>
              ))}
            </div>
          )}

          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl p-5 flex items-center gap-4">
            <span className="text-4xl">🎯</span>
            <div>
              <p className="font-semibold text-lg">Daily Calorie Goal</p>
              <p className="text-green-100 text-sm">{dietPlan.calorie_goal}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <MealCard title="Breakfast" emoji="🌅" items={dietPlan.breakfast} />
            <MealCard title="Lunch" emoji="☀️" items={dietPlan.lunch} />
            <MealCard title="Evening Snack" emoji="🍎" items={dietPlan.snacks} />
            <MealCard title="Dinner" emoji="🌙" items={dietPlan.dinner} />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center gap-3">
            <span className="text-3xl">💧</span>
            <div>
              <p className="font-semibold text-blue-800">Hydration</p>
              <p className="text-sm text-blue-700">{dietPlan.hydration}</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
            <h3 className="font-semibold text-red-800 mb-3">🚫 Foods to Avoid</h3>
            <div className="flex flex-wrap gap-2">
              {dietPlan.avoid.map((item, i) => (
                <span key={i} className="bg-red-100 text-red-700 text-xs font-medium px-3 py-1.5 rounded-full border border-red-200">{item}</span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Exercise Tab */}
      {tab === 'exercise' && exercisePlan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {exercisePlan.report_based && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🧬</span>
              <div>
                <p className="font-semibold text-blue-800 text-sm">Adapted for Your Health Conditions</p>
                <p className="text-xs text-blue-600 mt-0.5">Exercise intensity has been modified based on your lab reports.</p>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl p-5 flex items-center gap-4">
            <span className="text-4xl">🏃</span>
            <div>
              <p className="font-semibold text-lg">Fitness Level: {exercisePlan.fitness_level}</p>
              <p className="text-green-100 text-sm">Daily goal: {exercisePlan.daily_steps_goal}</p>
            </div>
          </div>

          {exercisePlan.cautions?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              {exercisePlan.cautions.map((c, i) => (
                <p key={i} className="text-sm text-red-700 font-medium mb-1">{c}</p>
              ))}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">📅 Weekly Exercise Plan with Videos</h3>
            <div className="space-y-3">
              {exercisePlan.weekly_plan?.map((day, i) => (
                <ExerciseDayCard 
                  key={i} 
                  {...day} 
                  onPlayVideo={setActiveVideo}
                />
              ))}
            </div>
          </div>

          {/* Video Library */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">🎬 Exercise Video Library</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {exercisePlan.all_exercise_videos && Object.entries(exercisePlan.all_exercise_videos).slice(0, 6).map(([key, video]) => (
                <VideoCard key={key} video={video} onPlay={() => setActiveVideo(video)} />
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-2xl p-4">
              <p className="font-semibold text-green-800 mb-2">🔥 Warm Up</p>
              <p className="text-sm text-green-700">{exercisePlan.warm_up}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="font-semibold text-blue-800 mb-2">❄️ Cool Down</p>
              <p className="text-sm text-blue-700">{exercisePlan.cool_down}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Yoga Tab */}
      {tab === 'yoga' && exercisePlan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-5 flex items-center gap-4">
            <span className="text-4xl">🧘</span>
            <div>
              <p className="font-semibold text-lg">Personalized Yoga Plan</p>
              <p className="text-purple-100 text-sm">Poses selected for your health conditions with video guides</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {exercisePlan.yoga?.map((pose, i) => (
              <div key={i} className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pose.pose}</h3>
                    <p className="text-xs text-purple-600 mt-1">✨ {pose.benefit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-100 text-purple-700 font-medium px-2 py-1 rounded-full">⏱ {pose.duration}</span>
                    {pose.video && (
                      <button onClick={() => setActiveVideo(pose.video)}
                        className="w-9 h-9 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full flex items-center justify-center transition-colors">
                        ▶️
                      </button>
                    )}
                  </div>
                </div>
                {pose.instructions && (
                  <div className="bg-purple-50 rounded-lg p-3 mt-3">
                    <p className="text-xs font-semibold text-purple-800 mb-2">Steps:</p>
                    <ol className="space-y-1">
                      {pose.instructions.slice(0, 3).map((step, j) => (
                        <li key={j} className="text-xs text-purple-700 flex items-start gap-2">
                          <span className="font-bold">{j+1}.</span> {step}
                        </li>
                      ))}
                    </ol>
                    {pose.reps && <p className="text-xs text-purple-600 mt-2 font-medium">🔄 {pose.reps}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Yoga Video Library */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">🎬 Yoga Video Library</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {exercisePlan.all_yoga_videos && Object.entries(exercisePlan.all_yoga_videos).slice(0, 6).map(([key, video]) => (
                <VideoCard key={key} video={video} title={video.title} onPlay={() => setActiveVideo(video)} />
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
            <h3 className="font-semibold text-indigo-800 mb-3">🌬️ Pranayama (Breathing) Practice</h3>
            <div className="space-y-3">
              {[
                { name: 'Anulom Vilom', key: 'anulom_vilom', desc: 'Alternate nostril breathing - 10 cycles' },
                { name: 'Kapalbhati', key: 'kapalbhati', desc: 'Forceful exhalations - 30-60 strokes' },
                { name: 'Bhramari', key: 'bhramari', desc: 'Humming bee breath - 5-10 times' },
              ].map((p, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                  </div>
                  {exercisePlan.all_yoga_videos?.[p.key] && (
                    <button onClick={() => setActiveVideo(exercisePlan.all_yoga_videos[p.key])}
                      className="w-9 h-9 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center">
                      ▶️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Period Care Tab */}
      {tab === 'periods' && (
        <PeriodCareTab periodCare={periodCare} activeVideo={activeVideo} setActiveVideo={setActiveVideo} />
      )}

      {/* Diet Planner Tab */}
      {tab === 'planner' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <DietPlannerForm onSubmit={handleCustomPlan} loading={customLoading} />
        </motion.div>
      )}

      {/* Custom Plan Results */}
      {tab === 'custom-result' && customPlan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => setTab('planner')} className="mb-4 text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
            ← Back to Planner
          </button>
          <CustomPlanResults plan={customPlan} />
        </motion.div>
      )}

      {/* Video Modal */}
      <AnimatePresence>
        {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
      </AnimatePresence>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700">
        ⚠️ These plans are general guidelines. Always consult a doctor, dietitian, or certified fitness trainer before starting any new diet or exercise program.
      </div>
    </div>
  )
}
