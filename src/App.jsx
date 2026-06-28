import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './Login'
import Planner from './Planner'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f5f5f5' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:24, marginBottom:8 }}>📅</div>
          <div style={{ fontSize:14, color:'#aaa' }}>Loading your planner…</div>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', padding:'16px' }}>
      <Planner user={user} />
    </div>
  )
}