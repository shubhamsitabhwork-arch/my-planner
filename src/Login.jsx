import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function handleSubmit() {
    if (!email || !password) {
      setIsError(true)
      setMessage('Please enter email and password.')
      return
    }
    setLoading(true)
    setMessage('')
    setIsError(false)

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) { setIsError(true); setMessage(error.message) }
        else setMessage('✓ Check your email to confirm your account!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setIsError(true); setMessage(error.message) }
      }
    } catch (e) {
      setIsError(true)
      setMessage('Network error. Check your connection.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f5f5', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'32px 24px', width:'100%', maxWidth:340, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📅</div>
          <h2 style={{ fontSize:22, fontWeight:600, color:'#1a1a1a', marginBottom:4 }}>My Planner</h2>
          <p style={{ fontSize:13, color:'#999' }}>{isSignup ? 'Create your account' : 'Sign in to sync your data'}</p>
        </div>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e8e8e8', borderRadius:8, fontSize:14, marginBottom:10, outline:'none', color:'#333', background:'#fafafa' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e8e8e8', borderRadius:8, fontSize:14, marginBottom:16, outline:'none', color:'#333', background:'#fafafa' }}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width:'100%', padding:'12px', background: loading ? '#a0b4ff' : '#4F7EFF', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, marginBottom:12, transition:'background 0.2s' }}
        >
          {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
        </button>

        {message && (
          <div style={{ fontSize:12, color: isError ? '#e53e3e' : '#38a169', marginBottom:12, padding:'8px 12px', background: isError ? '#fff5f5' : '#f0fff4', borderRadius:6, textAlign:'center' }}>
            {message}
          </div>
        )}

        <p style={{ fontSize:13, color:'#999', textAlign:'center' }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <span
            onClick={() => { setIsSignup(!isSignup); setMessage('') }}
            style={{ color:'#4F7EFF', cursor:'pointer', fontWeight:500 }}
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </span>
        </p>
      </div>
    </div>
  )
}