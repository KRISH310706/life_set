import { useState, useRef, useEffect } from 'react'
import { chatbotAPI, healthAPI } from '../api'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import LanguageSelector from '../components/LanguageSelector'

const QUICK_QUESTIONS = [
  { label: '🤒 I have a fever',           text: 'I have a fever, what should I do?' },
  { label: '💊 Diabetes tips',             text: 'How can I manage diabetes naturally?' },
  { label: '🏃 Best exercise for heart',   text: 'What is the best exercise for heart health?' },
  { label: '🥗 Healthy diet plan',         text: 'Give me a simple healthy diet plan' },
  { label: '😴 Improve sleep',             text: 'How can I improve my sleep quality?' },
  { label: '🧠 Reduce stress',             text: 'What are the best ways to reduce stress?' },
  { label: '⚡ What is LifeSet?',          text: 'What can you help me with?' },
  { label: '🩺 Check blood pressure',      text: 'How do I manage high blood pressure?' },
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0,1,2].map(i => (
        <span key={i} className="w-2.5 h-2.5 bg-green-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }} />
      ))}
    </div>
  )
}

function Message({ msg, isLast }) {
  const isUser = msg.role === 'user'

  const urgencyBorder = {
    emergency: 'border-l-4 border-red-500',
    high:      'border-l-4 border-orange-400',
    medium:    'border-l-4 border-yellow-400',
  }[msg.urgency] || ''

  // Convert **bold** markdown to styled text
  const formatText = (text) => {
    if (!text) return ''
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
      .replace(/^• /gm, '&bull; ')
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-up`}>
      {/* Bot avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-sm flex-shrink-0 mr-2.5 mt-0.5 shadow-sm">
          🤖
        </div>
      )}

      <div className={`max-w-[78%] space-y-2`}>
        {/* Main bubble */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-green-600 text-white rounded-br-sm'
            : `bg-white text-gray-800 rounded-bl-sm border border-gray-100 ${urgencyBorder}`
        }`}>
          {msg.urgency === 'emergency' && (
            <p className="font-bold text-red-600 mb-2 flex items-center gap-1.5">
              🚨 <span>EMERGENCY ALERT</span>
            </p>
          )}
          <div
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatText(msg.content) }}
          />
        </div>

        {/* Tips bubbles */}
        {!isUser && msg.tips && msg.tips.length > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 ml-0.5">
            <p className="text-xs font-bold text-green-700 mb-2 uppercase tracking-wider">Quick Tips</p>
            <ul className="space-y-1.5">
              {msg.tips.map((tip, i) => (
                <li key={i} className="text-xs text-green-900 flex items-start gap-2">
                  <span className="text-green-500 flex-shrink-0 mt-0.5 font-bold">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        {!isUser && msg.disclaimer && (
          <p className="text-xs text-gray-400 italic ml-1">
            ⚠️ General guidance only — not a medical diagnosis. Consult a doctor for personal advice.
          </p>
        )}

        {/* Timestamp */}
        <p className={`text-xs text-gray-400 ${isUser ? 'text-right' : 'ml-1'}`}>
          {msg.time}
          {msg.powered_by === 'gemini' && !isUser && (
            <span className="ml-2 bg-green-100 text-green-600 text-xs px-1.5 py-0.5 rounded-full font-medium">✨ AI</span>
          )}
        </p>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm flex-shrink-0 ml-2.5 mt-0.5">
          👤
        </div>
      )}
    </div>
  )
}

export default function Chatbot() {
  const { user } = useAuth()
  const { language, currentLanguage } = useLanguage()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! 👋 I'm your LifeSet Health Assistant.\n\nI can answer **any question** you have — health symptoms, diet advice, medicines, exercise plans, or even general knowledge questions.\n\nWhat would you like to know today?",
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      disclaimer: false,
      tips: [],
    }
  ])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!user) return
    healthAPI.getProfile(user.user_id).then(r => setUserProfile(r.data)).catch(() => {})
  }, [user])

  const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const sendMessage = async (text) => {
    const msgText = (text || input).trim()
    if (!msgText || loading) return

    const userMsg = { role: 'user', content: msgText, time: now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res  = await chatbotAPI.chat(msgText, history, null, userProfile, language)
      const data = res.data

      setMessages(prev => [...prev, {
        role:        'assistant',
        content:     data.response,
        tips:        data.tips || [],
        urgency:     data.urgency,
        disclaimer:  data.disclaimer,
        powered_by:  data.powered_by,
        time:        now(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: 'Sorry, I had trouble connecting to the server. Please make sure the backend is running and try again.',
        tips:    [],
        time:    now(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => {
    setMessages([{
      role:    'assistant',
      content: "Chat cleared! 👋 Ask me anything — health or otherwise. I'm here to help!",
      time:    now(),
      tips:    [],
      disclaimer: false,
    }])
  }

  const showQuickQuestions = messages.length <= 1

  return (
    <div className="max-w-3xl mx-auto flex flex-col animate-fade-up" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="font-display text-3xl text-gray-900">Health AI Chat 🤖</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Ask me anything — health, diet, lifestyle, or general questions</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelector compact />
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-green-700">AI Online</span>
          </div>
          <button onClick={clearChat}
            className="text-sm text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition">
            Clear
          </button>
        </div>
      </div>

      {/* Language indicator */}
      {language !== 'en' && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-lg">{currentLanguage?.flag}</span>
          <p className="text-sm text-blue-700">
            Responses will be translated to <strong>{currentLanguage?.name}</strong>
          </p>
        </div>
      )}

      {/* Chat window */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5">
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} isLast={i === messages.length - 1} />
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start mb-4 animate-fade-up">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-sm flex-shrink-0 mr-2.5 mt-0.5">
                🤖
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions */}
        {showQuickQuestions && (
          <div className="px-5 pb-3 border-t border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-2">Quick Questions</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q.text)}
                  className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded-full transition font-medium whitespace-nowrap">
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-green-400 focus-within:border-transparent transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Ask me anything... (Enter to send, Shift+Enter for new line)"
                className="w-full px-4 py-3 text-sm outline-none resize-none font-sans bg-transparent"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-green-sm flex-shrink-0 flex items-center gap-2 text-sm"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span>Send →</span>
              }
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            ⚠️ AI responses are for guidance only. Always consult a doctor for medical decisions.
          </p>
        </div>
      </div>
    </div>
  )
}
