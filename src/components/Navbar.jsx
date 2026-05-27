import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { CircuitBoard, LogIn, LogOut, LayoutDashboard, Upload, Users, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => authListener?.subscription?.unsubscribe()
  }, [])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fn = isSignUp ? supabase.auth.signUp : supabase.auth.signInWithPassword
    const { error: err } = await fn({ email, password })

    if (err) {
      setError(err.message)
    } else {
      setShowAuth(false)
      setEmail('')
      setPassword('')
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) setError(error.message)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <CircuitBoard className="w-6 h-6 text-cyan-400" />
            CircuitFix Hub
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/upload" className="flex items-center gap-1 text-sm text-zinc-400 hover:text-cyan-400 transition">
              <Upload className="w-4 h-4" /> Analyze
            </Link>
            <Link to="/dashboard" className="flex items-center gap-1 text-sm text-zinc-400 hover:text-cyan-400 transition">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link to="/community" className="flex items-center gap-1 text-sm text-zinc-400 hover:text-cyan-400 transition">
              <Users className="w-4 h-4" /> Community
            </Link>

            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-sm text-zinc-400 hover:text-red-400 transition"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1 text-sm bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg font-medium transition"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {showAuth && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
              <button onClick={() => setShowAuth(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full border border-zinc-700 hover:border-zinc-500 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition mb-4"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-600">or</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            <form onSubmit={handleAuth}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 mb-3"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 mb-4"
              />

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {isSignUp ? 'Creating...' : 'Signing in...'}</>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            <p className="text-sm text-zinc-500 text-center mt-4">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError('') }}
                className="text-cyan-400 hover:underline"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
