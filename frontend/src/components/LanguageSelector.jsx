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

  // Compact mode for mobile header - just show flag
  if (compact) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          aria-label="Change language"
        >
          <span className="text-lg">{currentLanguage.flag}</span>
        </button>

        {isOpen && (
          <>
            {/* Backdrop to close on tap outside */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => setIsOpen(false)}
            />
            <div 
              className="fixed top-14 right-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-[9999] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3">
                <p className="font-bold text-sm">🌍 Select Language</p>
              </div>

              {/* Search */}
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search language..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white"
                />
              </div>

              {/* List */}
              <div className="max-h-64 overflow-y-auto">
                {filtered.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLanguage(lang.code)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors ${
                      language === lang.code ? 'bg-green-50' : ''
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{lang.name}</p>
                      <p className="text-xs text-gray-400 truncate">{lang.native}</p>
                    </div>
                    {language === lang.code && (
                      <span className="text-green-500 text-lg">✓</span>
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-400 text-sm">
                    No languages found
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // Full mode for desktop sidebar
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="text-gray-700 flex-1 text-left truncate">{currentLanguage.name}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3">
            <p className="font-bold text-sm">🌍 Select Language</p>
          </div>

          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search language..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white"
            />
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code)
                  setIsOpen(false)
                  setSearch('')
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left transition-colors ${
                  language === lang.code ? 'bg-green-50' : ''
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{lang.name}</p>
                </div>
                {language === lang.code && (
                  <span className="text-green-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
