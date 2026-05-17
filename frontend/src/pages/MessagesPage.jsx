import { useState, useEffect, useRef } from 'react'
import { chatAPI, authAPI } from '../api'
import { useAuth } from '../AuthContext'
import LanguageSelector from '../components/LanguageSelector'

function ChatThread({ myId, otherId, otherName }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const fetchThread = async () => {
    const res = await chatAPI.thread(myId, otherId)
    setMessages(res.data)
  }

  useEffect(() => {
    if (!otherId) return
    fetchThread()
    const iv = setInterval(fetchThread, 3000) // Poll every 3s
    return () => clearInterval(iv)
  }, [otherId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await chatAPI.send({ sender_id: myId, receiver_id: otherId, content: input.trim() })
      setInput('')
      fetchThread()
    } finally { setSending(false) }
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
          {otherName?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{otherName}</p>
          <p className="text-xs text-green-500">● Online</p>
        </div>
        <LanguageSelector compact />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-10 text-sm">
            <div className="text-4xl mb-2">💬</div>
            <p>No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.sender_id === myId
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
                  {m.sender_name?.[0]?.toUpperCase()}
                </div>
              )}
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                isMe ? 'bg-green-600 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
              }`}>
                <p>{m.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-green-200' : 'text-gray-400'}`}>
                  {new Date(m.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {isMe && <span className="ml-1">{m.is_read ? ' ✓✓' : ' ✓'}</span>}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          rows={1} placeholder="Type a message... (Enter to send)"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 font-sans"
          style={{ minHeight: '44px', maxHeight: '100px' }}
        />
        <button onClick={send} disabled={!input.trim() || sending}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold px-4 py-2.5 rounded-xl transition flex-shrink-0">
          {sending ? '...' : '→'}
        </button>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchConvs = async () => {
    try {
      const res = await chatAPI.conversations(user.user_id)
      setConversations(res.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchConvs(); const iv = setInterval(fetchConvs, 5000); return () => clearInterval(iv) }, [user])

  const getOther = (conv) => {
    const isUser1 = conv.user1_id === user.user_id
    return { id: isUser1 ? conv.user2_id : conv.user1_id, name: isUser1 ? conv.user2_name : conv.user1_name, role: isUser1 ? conv.user2_role : conv.user1_role }
  }

  return (
    <div className="animate-fade-up" style={{ height: 'calc(100vh - 130px)' }}>
      <div className="mb-4">
        <h1 className="font-display text-3xl text-gray-900">Messages 💬</h1>
        <p className="text-gray-500 mt-1 text-sm">Chat with your doctor or patients</p>
      </div>

      <div className="flex flex-col lg:flex-row bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 'calc(100% - 70px)' }}>
        {/* Sidebar */}
        <div className={`${selected ? 'hidden lg:flex' : 'flex'} w-full lg:w-72 border-r border-gray-100 flex-col flex-shrink-0`}>
          <div className="p-4 border-b border-gray-100">
            <p className="font-semibold text-gray-700 text-sm">Conversations ({conversations.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>}
            {!loading && conversations.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">
                <div className="text-3xl mb-2">💬</div>
                <p>No conversations yet</p>
                <p className="text-xs mt-1">Find a doctor and start chatting</p>
              </div>
            )}
            {conversations.map(conv => {
              const other = getOther(conv)
              const isSelected = selected?.id === other.id
              return (
                <button key={conv.id} onClick={() => setSelected(other)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-green-50 transition-colors text-left border-b border-gray-50 ${isSelected ? 'bg-green-50' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${other.role === 'doctor' ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>
                    {other.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800 text-sm truncate">{other.name}</p>
                      {conv.unread_count > 0 && (
                        <span className="w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 capitalize">{other.role}</p>
                    {conv.last_message && <p className="text-xs text-gray-400 truncate mt-0.5">{conv.last_message}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className={`${selected ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
          {selected ? (
            <>
              {/* Back button for mobile */}
              <button 
                onClick={() => setSelected(null)}
                className="lg:hidden p-3 border-b border-gray-100 text-sm text-green-600 font-medium flex items-center gap-2"
              >
                ← Back to conversations
              </button>
              <ChatThread myId={user.user_id} otherId={selected.id} otherName={selected.name} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="font-semibold text-gray-600">Select a conversation</p>
                <p className="text-sm mt-1">or find a doctor to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
