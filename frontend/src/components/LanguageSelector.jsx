import { useState, useRef, useEffect } from 'react'
import { useLanguage, LANGUAGES } from '../LanguageContext'

export default function LanguageSelector({ compact = false }) {
  const { language, changeLanguage, currentLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="text-gray-700">{currentLanguage.name}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] overflow-hidden"
          style={{ right: 0, left: 'auto', maxWidth: 'calc(100vw - 20px)' }}>
          {/* Header */}
          <div className="bg-green-500 text-white p-3">
            <p className="font-bold">🌍 Select Language</p>
          </div>

          {/* Search */}
          <div className="p-2 border-b">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code)
                  setIsOpen(false)
                  setSearch('')
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left ${
                  language === lang.code ? 'bg-green-50 border-l-4 border-green-500' : ''
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{lang.name}</p>
                  <p className="text-xs text-gray-400">{lang.native}</p>
                </div>
                {language === lang.code && (
                  <span className="ml-auto text-green-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
