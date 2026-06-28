import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MO_COLORS = ['#6B7DB3','#7B9DB3','#4F9E6F','#D8855A','#7DA04F','#C4924A','#4F9080','#C4842A','#A05060','#8060A0','#4A82A0','#3F7FA0']
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const QUOTES = [
  'A small step today shapes tomorrow.',
  'Rest is part of the work.',
  'Clarity comes one page at a time.',
  'Notice what you notice.',
  'Done is better than perfect.'
]

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function hourLabel(h) {
  if (h === 0) return { top: '12', bot: 'am' }
  if (h < 12) return { top: String(h), bot: 'am' }
  if (h === 12) return { top: '12', bot: 'pm' }
  return { top: String(h - 12), bot: 'pm' }
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
  const [schedInputs, setSchedInputs] = useState({})

  const dk = dateKey(sel)

  // Load todos
  useEffect(() => {
    supabase.from('todos').select('*').eq('user_id', user.id).eq('date', dk).order('created_at')
      .then(({ data }) => setTodos(data || []))
  }, [dk, user.id])

  // Load schedule
  useEffect(() => {
    supabase.from('schedule').select('*').eq('user_id', user.id).eq('date', dk)
      .then(({ data }) => {
        const map = {}
        const inputs = {}
        ;(data || []).forEach(r => {
          map[r.hour] = { id: r.id, content: r.content }
          inputs[r.hour] = r.content
        })
        setSched(map)
        setSchedInputs(inputs)
      })
  }, [dk, user.id])

  // Load journal
  useEffect(() => {
    supabase.from('journal').select('*').eq('user_id', user.id).eq('date', dk).maybeSingle()
      .then(({ data }) => setJournal(data || { text: '', mood: '' }))
  }, [dk, user.id])

  // Load dots for calendar
  useEffect(() => {
    const { y, m } = calView
    const start = `${y}-${String(m+1).padStart(2,'0')}-01`
    const end = `${y}-${String(m+1).padStart(2,'0')}-31`
    Promise.all([
      supabase.from('todos').select('date').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('schedule').select('date').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('journal').select('date').eq('user_id', user.id).gte('date', start).lte('date', end)
    ]).then(([t, s, j]) => {
      const dots = {}
      ;[...(t.data||[]), ...(s.data||[]), ...(j.data||[])].forEach(r => { dots[r.date] = true })
      setDotDates(dots)
    })
  }, [calView, user.id])

  async function addTodo() {
    if (!todoInput.trim()) return
    const { data, error } = await supabase.from('todos')
      .insert({ user_id: user.id, date: dk, text: todoInput.trim(), done: false })
      .select().single()
    if (!error) { setTodos(prev => [...prev, data]); setTodoInput('') }
  }

  async function toggleTodo(todo) {
    const { error } = await supabase.from('todos').update({ done: !todo.done }).eq('id', todo.id)
    if (!error) setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))
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
        const { data } = await supabase.from('schedule')
          .insert({ user_id: user.id, date: dk, hour, content }).select().single()
        if (data) setSched(prev => ({ ...prev, [hour]: { id: data.id, content } }))
      }
    } else if (existing) {
      await supabase.from('schedule').delete().eq('id', existing.id)
      setSched(prev => { const n = { ...prev }; delete n[hour]; return n })
    }
  }

  async function saveJournal() {
    await supabase.from('journal').upsert(
      { user_id: user.id, date: dk, text: journal.text, mood: journal.mood },
      { onConflict: 'user_id,date' }
    )
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  async function updateMood(mood) {
    const newJ = { ...journal, mood }
    setJournal(newJ)
    await supabase.from('journal').upsert(
      { user_id: user.id, date: dk, text: newJ.text || '', mood },
      { onConflict: 'user_id,date' }
    )
  }

  function autoResize(e) {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const done = todos.filter(t => t.done).length
  const { y, m } = calView
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m+1, 0).getDate()
  const prevMonthDays = new Date(y, m, 0).getDate()
  const years = [sel.getFullYear()-1, sel.getFullYear(), sel.getFullYear()+1]

  const S = {
    app: { display:'grid', gridTemplateColumns:'220px 1fr', minHeight:'700px', border:'1px solid #e8e8e8', borderRadius:14, overflow:'hidden', background:'#fafafa', position:'relative', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', fontSize:13 },
    sidebar: { background:'#fff', borderRight:'1px solid #eee', display:'flex', flexDirection:'column', overflow:'hidden' },
    main: { display:'flex', flexDirection:'column', overflow:'hidden' },
    navBtn: { background:'none', border:'none', color:'#aaa', fontSize:17, padding:'2px 8px', borderRadius:4, cursor:'pointer', lineHeight:1 },
    secHdr: { fontSize:9, letterSpacing:'0.1em', color:'#bbb', padding:'8px 12px 3px', textTransform:'uppercase' },
    tab: (active) => ({ padding:'7px 14px', fontSize:12, cursor:'pointer', color: active?'#4F7EFF':'#999', borderBottom: active?'2px solid #4F7EFF':'2px solid transparent', marginBottom:-1, fontWeight: active?500:400, background:'none', border:'none', borderBottom: active?'2px solid #4F7EFF':'2px solid transparent' }),
  }

  return (
    <div style={S.app}>

      {/* SIDEBAR */}
      <div style={S.sidebar}>

        {/* Calendar nav */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 10px', borderBottom:'1px solid #f0f0f0' }}>
          <button style={S.navBtn} onClick={() => setCalView(v => { let nm=v.m-1,ny=v.y; if(nm<0){nm=11;ny--;} return{y:ny,m:nm} })}>‹</button>
          <span style={{ fontSize:12, fontWeight:500, color:'#444' }}>{SHORT[m]} {y}</span>
          <button style={S.navBtn} onClick={() => setCalView(v => { let nm=v.m+1,ny=v.y; if(nm>11){nm=0;ny++;} return{y:ny,m:nm} })}>›</button>
        </div>

        {/* Mini calendar */}
        <div style={{ padding:'6px 8px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', textAlign:'center', marginBottom:2 }}>
            {DAYS.map(d => <span key={d} style={{ fontSize:9, color:'#ccc' }}>{d}</span>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`p${i}`} style={{ textAlign:'center', fontSize:10, color:'#e0e0e0', padding:'2px 0' }}>{prevMonthDays-firstDay+1+i}</div>
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = i + 1
              const dt = new Date(y, m, d)
              const isToday = dt.toDateString() === today.toDateString()
              const isSel = dt.toDateString() === sel.toDateString()
              const hasDot = dotDates[dateKey(dt)]
              return (
                <div key={d} onClick={() => setSel(new Date(y,m,d))} style={{ textAlign:'center', fontSize:10, padding:'2px 0', cursor:'pointer' }}>
                  <div style={{ width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', margin:'auto', borderRadius:'50%', background: isToday?'#4F7EFF': isSel?'#e8eeff':'transparent', color: isToday?'#fff': isSel?'#4F7EFF':'#444', fontWeight: isToday||isSel?600:400 }}>{d}</div>
                  <div style={{ height:3, width:3, borderRadius:'50%', background: hasDot?'#4F7EFF':'transparent', margin:'1px auto 0' }} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Todos */}
        <div style={S.secHdr}>To-do</div>
        <div style={{ overflowY:'auto', maxHeight:180, padding:'0 6px 4px' }}>
          {todos.length === 0 && <div style={{ padding:'6px 6px', fontSize:11, color:'#ccc' }}>No tasks — add one below</div>}
          {todos.map(t => (
            <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:5, padding:'3px 4px', borderRadius:5 }}>
              <div onClick={() => toggleTodo(t)} style={{ width:13, height:13, border:`1.5px solid ${t.done?'#4F7EFF':'#ccc'}`, borderRadius:3, flexShrink:0, marginTop:2, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background:t.done?'#4F7EFF':'transparent', color:'#fff', fontSize:8 }}>{t.done?'✓':''}</div>
              <span style={{ fontSize:11, flex:1, color:t.done?'#ccc':'#333', textDecoration:t.done?'line-through':'none', lineHeight:1.4, wordBreak:'break-word' }}>{t.text}</span>
              <button onClick={() => deleteTodo(t.id)} style={{ background:'none', border:'none', color:'#ddd', fontSize:12, padding:'0 1px', flexShrink:0, cursor:'pointer' }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px 8px', borderBottom:'1px solid #f0f0f0' }}>
          <input value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&addTodo()} placeholder="Add task…" style={{ flex:1, border:'none', background:'none', fontSize:11, color:'#333', outline:'none' }} />
          <button onClick={addTodo} style={{ background:'none', border:'none', color:'#bbb', fontSize:18, lineHeight:1, cursor:'pointer' }}>+</button>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:6, padding:'8px 10px', marginTop:'auto', borderTop:'1px solid #f5f5f5' }}>
          {[{n:todos.length,l:'tasks'},{n:done,l:'done'},{n:todos.length>0?Math.round(done/todos.length*100):0,l:'%'}].map(s => (
            <div key={s.l} style={{ flex:1, background:'#f8f8f8', borderRadius:6, padding:'5px 4px', textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:500, color:'#333' }}>{s.n}</div>
              <div style={{ fontSize:8, color:'#bbb', marginTop:1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div style={{ padding:'6px 10px 10px', fontSize:10, color:'#ccc', lineHeight:1.5, fontStyle:'italic' }}>
          {QUOTES[sel.getDate() % QUOTES.length]}
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>

        {/* Date header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #f0f0f0', background:'#fff' }}>
          <button style={S.navBtn} onClick={() => setSel(d => { const n=new Date(d); n.setDate(n.getDate()-1); return n })}>‹</button>
          <span style={{ fontSize:13, fontWeight:500, color:'#333' }}>{sel.getDate()} {dayNames[sel.getDay()]} · {SHORT[sel.getMonth()]} {sel.getFullYear()}</span>
          <button style={S.navBtn} onClick={() => setSel(d => { const n=new Date(d); n.setDate(n.getDate()+1); return n })}>›</button>
        </div>

        {/* Tabs row */}
        <div style={{ display:'flex', borderBottom:'1px solid #f0f0f0', background:'#fff' }}>
          <button style={S.tab(activeTab==='schedule')} onClick={() => setActiveTab('schedule')}>Schedule</button>
          <button style={S.tab(activeTab==='journal')} onClick={() => setActiveTab('journal')}>Journal</button>
          <button onClick={() => supabase.auth.signOut()} style={{ marginLeft:'auto', padding:'7px 12px', fontSize:11, color:'#ccc', background:'none', border:'none', cursor:'pointer' }}>Sign out</button>
        </div>

        {/* Schedule */}
        {activeTab === 'schedule' && (
          <div style={{ flex:1, overflowY:'auto' }}>
            {HOURS.map(h => {
              const isNight = h < 6 || h >= 22
              const lbl = hourLabel(h)
              return (
                <div key={h} style={{ display:'grid', gridTemplateColumns:'40px 1fr', borderBottom:'1px solid #f5f5f5', background: isNight?'#fcfcfc':'#fff' }}>
                  <div style={{ fontSize:9, color:'#ccc', padding:'7px 4px 0 6px', textAlign:'right', lineHeight:1.4, userSelect:'none' }}>
                    {lbl.top}<br/><span style={{ fontSize:8 }}>{lbl.bot}</span>
                  </div>
                  <div style={{ padding:'2px 6px', minHeight:34 }}>
                    <textarea
                      value={schedInputs[h] || ''}
                      onChange={e => {
                        setSchedInputs(prev => ({ ...prev, [h]: e.target.value }))
                        autoResize(e)
                      }}
                      onBlur={e => updateSched(h, e.target.value)}
                      rows={1}
                      placeholder={isNight ? '' : ''}
                      style={{ width:'100%', border:'none', background:'none', fontSize:11, color:'#333', outline:'none', resize:'none', overflow:'hidden', lineHeight:1.5, padding:'5px 0', minHeight:26, fontFamily:'inherit' }}
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
              <span style={{ fontSize:11, color:'#aaa' }}>Mood:</span>
              {['great','good','okay','low','stressed'].map(mood => (
                <button key={mood} onClick={() => updateMood(mood)} style={{ padding:'3px 10px', border:`1px solid ${journal.mood===mood?'#4F7EFF':'#eee'}`, borderRadius:20, background: journal.mood===mood?'#e8eeff':'#fff', fontSize:11, color: journal.mood===mood?'#4F7EFF':'#aaa', cursor:'pointer' }}>{mood}</button>
              ))}
            </div>
            <textarea
              value={journal.text || ''}
              onChange={e => setJournal(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Write about your day…"
              style={{ flex:1, minHeight:260, border:'1px solid #eee', borderRadius:10, padding:12, fontSize:13, color:'#333', background:'#fff', resize:'none', outline:'none', lineHeight:1.7, fontFamily:'inherit' }}
            />
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={saveJournal} style={{ padding:'6px 16px', background:'#4F7EFF', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer' }}>Save entry</button>
              {savedMsg && <span style={{ fontSize:11, color:'#38a169' }}>Saved ✓</span>}
            </div>
          </div>
        )}
      </div>

      {/* MONTH PANEL */}
      <div style={{ width: panelOpen?120:0, overflow:'hidden', borderLeft: panelOpen?'1px solid #eee':'none', background:'#fff', transition:'width 0.22s ease', flexShrink:0 }}>
        <div style={{ width:120, overflowY:'auto', height:'100%', padding:'8px 0' }}>
          {years.map(yr => (
            <div key={yr}>
              <div onClick={() => setCollapsedYears(p => ({ ...p, [yr]:!p[yr] }))} style={{ fontSize:10, fontWeight:600, color:'#bbb', padding:'6px 10px 3px', letterSpacing:'0.06em', cursor:'pointer', display:'flex', justifyContent:'space-between', userSelect:'none' }}>
                <span>{yr}</span>
                <span style={{ transform: collapsedYears[yr]?'rotate(-90deg)':'rotate(0)', transition:'transform 0.15s', display:'inline-block' }}>▾</span>
              </div>
              {!collapsedYears[yr] && SHORT.map((mn, mi) => {
                const isActive = sel.getFullYear()===yr && sel.getMonth()===mi
                return (
                  <div key={mn} onClick={() => { const d=new Date(yr,mi,Math.min(sel.getDate(),new Date(yr,mi+1,0).getDate())); setSel(d); setCalView({y:yr,m:mi}) }} style={{ display:'flex', alignItems:'center', padding:'4px 8px 4px 12px', fontSize:11, cursor:'pointer', color: isActive?'#4F7EFF':'#999', borderLeft: isActive?'2px solid #4F7EFF':'2px solid transparent', background: isActive?'#f0f4ff':'transparent', gap:6 }}>
                    <div style={{ width:7, height:7, borderRadius:2, background:MO_COLORS[mi], flexShrink:0 }} />
                    {mn}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* MONTHS TOGGLE */}
      <button onClick={() => setPanelOpen(p => !p)} style={{ position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', background:'#fff', border:'1px solid #eee', borderRight:'none', borderRadius:'6px 0 0 6px', padding:'12px 4px', color:'#bbb', fontSize:10, writingMode:'vertical-rl', letterSpacing:'0.06em', zIndex:10, cursor:'pointer' }}>
        {panelOpen ? 'Months ‹' : 'Months ›'}
      </button>
    </div>
  )
}