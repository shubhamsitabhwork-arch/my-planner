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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'#aaa', fontSize:14 }}>Loading…</div>
  if (!user) return <Login />
  return (
    <div style={{ padding: 24, minHeight:'100vh', background:'#f5f5f5' }}>
      <Planner user={user} />
    </div>
  )
}