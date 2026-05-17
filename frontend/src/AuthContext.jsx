import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lifeset_user')) } catch { return null }
  })

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('lifeset_user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('lifeset_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isDoctor: user?.role === 'doctor' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
