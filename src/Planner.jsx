import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MO_COLORS = ['#6B7DB3','#7B9DB3','#4F9E6F','#D8855A','#7DA04F','#C4924A','#4F9080','#C4842A','#A05060','#8060A0','#4A82A0','#3F7FA0']
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const QUOTES = ['A small step today shapes tomorrow.','Rest is part of the work.','Clarity comes one page at a time.','Notice what you notice.','Done is better than perfect.']

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function Planner({ user }) {
  const today = new Date()
  const [sel, setSel] = useState(new Date())
  const [calView, setCalView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [todos, setTodos] = useState([])
  const [sched, setSched] = useState({})
  const [journal, setJournal] = useState({ text: '', mood: '' })
  const [todoInput, setTodoInput] = useState('')
  const [activeTab, setActiveTab] = useState('schedule')
  const [panelOpen, setPanelOpen] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [collapsedYears, setCollapsedYears] = useState({})
  const [dotDates, setDotDates] = useState({})

  const dk = dateKey(sel)

  // Load todos for selected date
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('todos').select('*').eq('user_id', user.id).eq('date', dk).order('created_at')
      setTodos(data || [])
    }
    load()
  }, [dk, user.id])

  // Load schedule for selected date
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('schedule').select('*').eq('user_id', user.id).eq('date', dk)
      const map = {}
      ;(data || []).forEach(r => { map[r.hour] = { id: r.id, content: r.content } })
      setSched(map)
    }
    load()
  }, [dk, user.id])

  // Load journal for selected date
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('journal').select('*').eq('user_id', user.id).eq('date', dk).single()
      setJournal(data || { text: '', mood: '' })
    }
    load()
  }, [dk, user.id])

  // Load dot indicators for current calendar month
  useEffect(() => {
    async function loadDots() {
      const { y, m } = calView
      const start = `${y}-${String(m+1).padStart(2,'0')}-01`
      const end = `${y}-${String(m+1).padStart(2,'0')}-31`
      const [t, s, j] = await Promise.all([
        supabase.from('todos').select('date').eq('user_id', user.id).gte('date', start).lte('date', end),
        supabase.from('schedule').select('date').eq('user_id', user.id).gte('date', start).lte('date', end),
        supabase.from('journal').select('date').eq('user_id', user.id).gte('date', start).lte('date', end)
      ])
      const dots = {}
      ;[...(t.data||[]), ...(s.data||[]), ...(j.data||[])].forEach(r => { dots[r.date] = true })
      setDotDates(dots)
    }
    loadDots()
  }, [calView, user.id])

  async function addTodo() {
    if (!todoInput.trim()) return
    const { data } = await supabase.from('todos').insert({ user_id: user.id, date: dk, text: todoInput.trim(), done: false }).select().single()
    setTodos(prev => [...prev, data])
    setTodoInput('')
  }

  async function toggleTodo(todo) {
    await supabase.from('todos').update({ done: !todo.done }).eq('id', todo.id)
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))
  }

  async function deleteTodo(id) {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  async function updateSched(hour, content) {
    const existing = sched[hour]
    if (content.trim()) {
      if (existing) {
        await supabase.from('schedule').update({ content }).eq('id', existing.id)
        setSched(prev => ({ ...prev, [hour]: { ...existing, content } }))
      } else {
        const { data } = await supabase.from('schedule').insert({ user_id: user.id, date: dk, hour, content }).select().single()
        setSched(prev => ({ ...prev, [hour]: { id: data.id, content } }))
      }
    } else if (existing) {
      await supabase.from('schedule').delete().eq('id', existing.id)
      setSched(prev => { const n = { ...prev }; delete n[hour]; return n })
    }
  }

  async function saveJournal() {
    await supabase.from('journal').upsert({ user_id: user.id, date: dk, text: journal.text, mood: journal.mood }, { onConflict: 'user_id,date' })
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  async function updateMood(mood) {
    const newJ = { ...journal, mood }
    setJournal(newJ)
    await supabase.from('journal').upsert({ user_id: user.id, date: dk, text: newJ.text, mood }, { onConflict: 'user_id,date' })
  }

  function autoResize(e) { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const done = todos.filter(t => t.done).length

  // Mini calendar
  const { y, m } = calView
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m+1, 0).getDate()
  const prevDays = new Date(y, m, 0).getDate()

  const years = [sel.getFullYear()-1, sel.getFullYear(), sel.getFullYear()+1]

  return (
    <div style={{ display:'grid', gridTemplateColumns:'250px 1fr auto', minHeight:'720px', border:'1px solid #e5e5e5', borderRadius:12, overflow:'hidden', background:'#fafafa', position:'relative', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* SIDEBAR */}
      <div style={{ background:'#fff', borderRight:'1px solid #eee', display:'flex', flexDirection:'column' }}>
        {/* Mini calendar header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderBottom:'1px solid #eee' }}>
          <button onClick={() => setCalView(v => { let nm=v.m-1,ny=v.y; if(nm<0){nm=11;ny--;} return{y:ny,m:nm} })} style={{ background:'none', border:'none', color:'#888', fontSize:16, padding:'2px 6px', borderRadius:4 }}>‹</button>
          <span style={{ fontSize:13, fontWeight:500 }}>{SHORT[m]} {y}</span>
          <button onClick={() => setCalView(v => { let nm=v.m+1,ny=v.y; if(nm>11){nm=0;ny++;} return{y:ny,m:nm} })} style={{ background:'none', border:'none', color:'#888', fontSize:16, padding:'2px 6px', borderRadius:4 }}>›</button>
        </div>

        {/* Mini calendar grid */}
        <div style={{ padding:'8px 10px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', textAlign:'center', marginBottom:2 }}>
            {DAYS.map(d => <span key={d} style={{ fontSize:10, color:'#aaa' }}>{d}</span>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1 }}>
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`p${i}`} style={{ textAlign:'center', fontSize:11, color:'#ddd', padding:'3px 1px' }}>{prevDays-firstDay+1+i}</div>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = i+1
              const dt = new Date(y, m, d)
              const isToday = dt.toDateString() === today.toDateString()
              const isSel = dt.toDateString() === sel.toDateString()
              const dkk = dateKey(dt)
              const hasDot = dotDates[dkk]
              return (
                <div key={d} onClick={() => setSel(new Date(y,m,d))} style={{ textAlign:'center', fontSize:11, padding:'3px 1px', cursor:'pointer', borderRadius:4 }}>
                  <div style={{ width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', margin:'auto', borderRadius:'50%', background: isToday ? '#4F7EFF' : isSel ? '#e8eeff' : 'none', color: isToday ? '#fff' : isSel ? '#4F7EFF' : '#444', fontWeight: isToday||isSel ? 500 : 400 }}>{d}</div>
                  {hasDot ? <div style={{ width:3, height:3, borderRadius:'50%', background:'#4F7EFF', margin:'1px auto 0' }} /> : <div style={{ height:4 }} />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Todos */}
        <div style={{ fontSize:9, letterSpacing:'0.08em', color:'#aaa', padding:'8px 12px 3px', textTransform:'uppercase' }}>To-do</div>
        <div style={{ overflowY:'auto', padding:'0 8px 6px', maxHeight:200 }}>
          {todos.length === 0 && <div style={{ padding:'6px 4px', fontSize:11, color:'#bbb' }}>No tasks yet</div>}
          {todos.map(t => (
            <div key={t.id} className="todo-row" style={{ display:'flex', alignItems:'flex-start', gap:6, padding:4, borderRadius:5 }}>
              <div onClick={() => toggleTodo(t)} style={{ width:14, height:14, border:`1.5px solid ${t.done?'#4F7EFF':'#ccc'}`, borderRadius:3, flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background: t.done?'#4F7EFF':'none', color:'#fff', fontSize:9 }}>{t.done?'✓':''}</div>
              <span style={{ fontSize:12, color: t.done?'#bbb':'#333', textDecoration: t.done?'line-through':'none', flex:1, wordBreak:'break-word', lineHeight:1.4 }}>{t.text}</span>
              <button onClick={() => deleteTodo(t.id)} style={{ background:'none', border:'none', color:'#ccc', fontSize:12, padding:'0 2px', flexShrink:0 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px 8px' }}>
          <input value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&addTodo()} placeholder="Add task…" style={{ flex:1, border:'none', background:'none', fontSize:12, color:'#333', outline:'none' }} />
          <button onClick={addTodo} style={{ background:'none', border:'none', color:'#aaa', fontSize:18, lineHeight:1 }}>+</button>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:8, padding:'8px 12px', borderTop:'1px solid #eee', marginTop:'auto' }}>
          {[{ n: todos.length, l:'tasks' },{ n: done, l:'done' },{ n: todos.length>0?Math.round(done/todos.length*100):0, l:'%' }].map(s => (
            <div key={s.l} style={{ flex:1, background:'#f7f7f7', borderRadius:6, padding:'5px 6px', textAlign:'center' }}>
              <div style={{ fontSize:15, fontWeight:500, color:'#333' }}>{s.n}</div>
              <div style={{ fontSize:9, color:'#aaa', marginTop:1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div style={{ padding:'6px 12px 10px', borderTop:'1px solid #eee', fontSize:11, color:'#aaa', lineHeight:1.5 }}>
          {QUOTES[sel.getDate() % QUOTES.length]}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #eee' }}>
          <button onClick={() => setSel(d => { const n=new Date(d); n.setDate(n.getDate()-1); return n })} style={{ background:'none', border:'none', color:'#888', fontSize:16, padding:'2px 8px', borderRadius:4 }}>‹</button>
          <span style={{ fontSize:14, fontWeight:500, color:'#333' }}>{sel.getDate()} {dayNames[sel.getDay()]} — {SHORT[sel.getMonth()]} {sel.getFullYear()}</span>
          <button onClick={() => setSel(d => { const n=new Date(d); n.setDate(n.getDate()+1); return n })} style={{ background:'none', border:'none', color:'#888', fontSize:16, padding:'2px 8px', borderRadius:4 }}>›</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #eee' }}>
          {['schedule','journal'].map(tab => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding:'7px 14px', fontSize:12, cursor:'pointer', color: activeTab===tab?'#4F7EFF':'#888', borderBottom: activeTab===tab?'2px solid #4F7EFF':'2px solid transparent', marginBottom:-1, fontWeight: activeTab===tab?500:400, textTransform:'capitalize' }}>{tab}</div>
          ))}
          <div style={{ marginLeft:'auto', padding:'7px 14px', fontSize:11, color:'#bbb', cursor:'pointer' }} onClick={() => supabase.auth.signOut()}>Sign out</div>
        </div>

        {/* Schedule */}
        {activeTab === 'schedule' && (
          <div style={{ flex:1, overflowY:'auto' }}>
            {HOURS.map(h => {
              const isNight = h < 6 || h >= 22
              const label = h===0?'12\nam':h<12?`${h}\nam`:h===12?'12\npm':`${h-12}\npm`
              const val = sched[h]?.content || ''
              return (
                <div key={h} style={{ display:'grid', gridTemplateColumns:'44px 1fr', borderBottom:'1px solid #f0f0f0', background: isNight?'#fafafa':'#fff' }}>
                  <div style={{ fontSize:10, color:'#bbb', padding:'7px 6px 0 8px', textAlign:'right', lineHeight:1.3, whiteSpace:'pre', userSelect:'none' }}>{label}</div>
                  <div style={{ padding:'3px 6px', minHeight:36 }}>
                    <textarea
                      defaultValue={val}
                      onBlur={e => updateSched(h, e.target.value)}
                      onInput={autoResize}
                      rows={1}
                      placeholder={isNight ? '…' : ''}
                      style={{ width:'100%', border:'none', background:'none', fontSize:12, color:'#333', outline:'none', resize:'none', overflow:'hidden', lineHeight:1.5, padding:'4px 0', minHeight:28, fontFamily:'inherit' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Journal */}
        {activeTab === 'journal' && (
          <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'#888' }}>Mood:</span>
              {['great','good','okay','low','stressed'].map(mood => (
                <button key={mood} onClick={() => updateMood(mood)} style={{ padding:'3px 9px', border:`1px solid ${journal.mood===mood?'#4F7EFF':'#e0e0e0'}`, borderRadius:20, background: journal.mood===mood?'#e8eeff':'none', fontSize:11, color: journal.mood===mood?'#4F7EFF':'#888' }}>{mood}</button>
              ))}
            </div>
            <textarea
              value={journal.text}
              onChange={e => setJournal(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Write about your day…"
              style={{ width:'100%', minHeight:280, border:'1px solid #eee', borderRadius:8, padding:10, fontSize:13, color:'#333', background:'#fff', resize:'vertical', outline:'none', lineHeight:1.7, fontFamily:'inherit' }}
            />
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={saveJournal} style={{ padding:'5px 14px', background:'#4F7EFF', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:500 }}>Save entry</button>
              {savedMsg && <span style={{ fontSize:11, color:'green' }}>Saved ✓</span>}
            </div>
          </div>
        )}
      </div>

      {/* MONTH PANEL */}
      <div style={{ width: panelOpen?130:0, overflow:'hidden', borderLeft:'1px solid #eee', background:'#fff', transition:'width 0.25s ease', flexShrink:0 }}>
        <div style={{ width:130, overflowY:'auto', height:'100%', padding:'8px 0' }}>
          {years.map(yr => (
            <div key={yr}>
              <div onClick={() => setCollapsedYears(p => ({ ...p, [yr]:!p[yr] }))} style={{ fontSize:10, fontWeight:500, color:'#aaa', padding:'6px 10px 3px', letterSpacing:'0.06em', cursor:'pointer', display:'flex', justifyContent:'space-between' }}>
                <span>{yr}</span>
                <span style={{ transform: collapsedYears[yr]?'rotate(-90deg)':'none', transition:'transform 0.15s', display:'inline-block' }}>▾</span>
              </div>
              {!collapsedYears[yr] && SHORT.map((mn, mi) => {
                const isActive = sel.getFullYear()===yr && sel.getMonth()===mi
                return (
                  <div key={mn} onClick={() => { const d=new Date(yr,mi,Math.min(sel.getDate(),new Date(yr,mi+1,0).getDate())); setSel(d); setCalView({y:yr,m:mi}) }} style={{ display:'flex', alignItems:'center', padding:'4px 10px 4px 14px', fontSize:12, cursor:'pointer', color: isActive?'#4F7EFF':'#888', borderLeft: isActive?'3px solid #4F7EFF':'3px solid transparent', background: isActive?'#e8eeff':'none', gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:MO_COLORS[mi], flexShrink:0 }} />
                    {mn}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* TOGGLE BUTTON */}
      <button onClick={() => setPanelOpen(p => !p)} style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', background:'#fff', border:'1px solid #eee', borderRight:'none', borderRadius:'6px 0 0 6px', padding:'10px 5px', color:'#aaa', fontSize:11, writingMode:'vertical-rl', letterSpacing:'0.05em', zIndex:10 }}>
        {panelOpen ? 'Months ‹' : 'Months ›'}
      </button>
    </div>
  )
}