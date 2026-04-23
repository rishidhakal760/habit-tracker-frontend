import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
const API = 'http://localhost:8080/api'
export default function Login() {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register'
      const payload = tab === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password }

      const res = await axios.post(`${API}${endpoint}`, payload)
      localStorage.setItem('token', res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-violet-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1.5" fill="white"/>
              <rect x="11" y="3" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="3" y="11" width="6" height="6" rx="1.5" fill="white" opacity="0.6"/>
              <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white"/>
            </svg>
          </div>
          <h1 className="text-xl font-medium text-white">HabitTracker</h1>
          <p className="text-sm text-zinc-500 mt-1">Build better habits, one day at a time</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-zinc-950 rounded-lg p-1 mb-6">
          <button
            onClick={() => { setTab('login'); setError('') }}
            className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${
              tab === 'login'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setTab('register'); setError('') }}
            className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${
              tab === 'register'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Name</label>
              <input
                name="name"
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Email</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}