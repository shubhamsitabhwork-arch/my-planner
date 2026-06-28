import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setMessage('')
    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f5f5' }}>
      <div style={{ background:'#fff', borderRadius:12, padding:'32px 28px', width:320, boxShadow:'0 2px 16px rgba(0,0,0,0.08)' }}>
        <h2 style={{ fontSize:20, fontWeight:600, marginBottom:4 }}>My Planner</h2>
        <p style={{ fontSize:13, color:'#888', marginBottom:24 }}>{isSignup ? 'Create your account' : 'Sign in to sync your data'}</p>
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width:'100%', padding:'9px 12px', border:'1px solid #e0e0e0', borderRadius:7, fontSize:14, marginBottom:10, outline:'none' }}
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ width:'100%', padding:'9px 12px', border:'1px solid #e0e0e0', borderRadius:7, fontSize:14, marginBottom:16, outline:'none' }}
        />
        <button
          onClick={handleSubmit} disabled={loading}
          style={{ width:'100%', padding:'10px', background:'#4F7EFF', color:'#fff', border:'none', borderRadius:7, fontSize:14, fontWeight:500, marginBottom:12 }}
        >
          {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
        </button>
        {message && <p style={{ fontSize:12, color: message.includes('Check') ? 'green' : 'red', marginBottom:10 }}>{message}</p>}
        <p style={{ fontSize:12, color:'#888', textAlign:'center' }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => setIsSignup(!isSignup)} style={{ color:'#4F7EFF', cursor:'pointer' }}>
            {isSignup ? 'Sign in' : 'Sign up'}
          </span>
        </p>
      </div>
    </div>
  )
}