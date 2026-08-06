'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{display:'flex',gap:'10px',padding:'6px 0',fontSize:'13px'}}>
      <span style={{color:'#aeaeb2',fontWeight:'700',letterSpacing:'0.2px',minWidth:'110px'}}>{label}</span>
      <span style={{color:'#152238'}}>{value}</span>
    </div>
  )
}

function StatTile({ label, value, accent, onClick }) {
  return (
    <div onClick={onClick} className={onClick ? 'clickable-tile' : undefined}
      style={{flex:1,minWidth:'120px',background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'14px',padding:'18px 20px',boxShadow:'0 2px 12px rgba(0,0,0,0.03)',cursor: onClick ? 'pointer' : 'default',transition:'transform 0.15s ease, box-shadow 0.15s ease'}}>
      <div style={{fontSize:'26px',fontWeight:'800',color: accent || '#152238',letterSpacing:'-0.5px',marginBottom:'4px'}}>{value}</div>
      <div style={{fontSize:'12px',color:'#6e6e73',fontWeight:'600'}}>{label}{onClick && ' →'}</div>
    </div>
  )
}

function formatShortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function niceMax(value) {
  if (value <= 0) return 1
  const exp = Math.floor(Math.log10(value))
  const base = Math.pow(10, exp)
  const norm = value / base
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return niceNorm * base
}

// Hand-rolled inline SVG — the app has no charting dependency and this is
// the only growth chart on the site, so a small library isn't worth adding.
function GrowthChart({ data, color }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const width = 600, height = 200
  const padLeft = 46, padRight = 12, padTop = 16, padBottom = 26
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  if (!data || data.length === 0) {
    return <div style={{color:'#aeaeb2',fontSize:'13px',padding:'52px 0',textAlign:'center'}}>No data yet</div>
  }

  const n = data.length
  const maxVal = niceMax(Math.max(...data.map(d => d.value), 1))
  const xAt = i => padLeft + (n === 1 ? 0 : (i / (n - 1)) * plotW)
  const yAt = v => padTop + plotH - (v / maxVal) * plotH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(d.value)}`).join(' ')
  const areaPath = `${linePath} L ${xAt(n - 1)} ${padTop + plotH} L ${xAt(0)} ${padTop + plotH} Z`
  const yTicks = [...new Set([0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f)))]

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const frac = Math.min(1, Math.max(0, (px - padLeft) / plotW))
    setHoverIndex(Math.round(frac * (n - 1)))
  }

  const hovered = hoverIndex != null ? data[hoverIndex] : null
  const tooltipLeftPct = hoverIndex != null ? (xAt(hoverIndex) / width) * 100 : 0
  const tooltipFlip = hoverIndex != null && hoverIndex > n * 0.7

  return (
    <div style={{position:'relative'}}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{width:'100%',height:'auto',display:'block',cursor:'crosshair'}}
        onMouseMove={handleMove} onMouseLeave={() => setHoverIndex(null)}>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={padLeft} x2={width - padRight} y1={yAt(t)} y2={yAt(t)} stroke="#e1e0d9" strokeWidth="1"/>
            <text x={padLeft - 8} y={yAt(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#898781">{t.toLocaleString()}</text>
          </g>
        ))}
        <path d={areaPath} fill={color} opacity="0.1" stroke="none"/>
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={xAt(n - 1)} cy={yAt(data[n - 1].value)} r="4" fill={color} stroke="white" strokeWidth="2"/>
        {hoverIndex != null && (
          <>
            <line x1={xAt(hoverIndex)} x2={xAt(hoverIndex)} y1={padTop} y2={padTop + plotH} stroke="#c3c2b7" strokeWidth="1"/>
            <circle cx={xAt(hoverIndex)} cy={yAt(data[hoverIndex].value)} r="4" fill={color} stroke="white" strokeWidth="2"/>
          </>
        )}
        <text x={padLeft} y={height - 8} fontSize="10" fill="#898781">{formatShortDate(data[0].day)}</text>
        <text x={width - padRight} y={height - 8} textAnchor="end" fontSize="10" fill="#898781">{formatShortDate(data[n - 1].day)}</text>
      </svg>
      {hovered && (
        <div style={{position:'absolute',top:0,left:`${tooltipLeftPct}%`,transform: tooltipFlip ? 'translateX(-100%)' : 'none',background:'#152238',color:'white',fontSize:'12px',padding:'6px 10px',borderRadius:'8px',pointerEvents:'none',whiteSpace:'nowrap'}}>
          <div style={{fontWeight:700}}>{hovered.value.toLocaleString()}</div>
          <div style={{opacity:0.7,fontSize:'11px'}}>{formatShortDate(hovered.day)}</div>
        </div>
      )}
    </div>
  )
}

function GrowthPanel({ title, data, color, onClick }) {
  const current = data && data.length ? data[data.length - 1].value : 0
  return (
    <div style={{flex:1,minWidth:'280px',background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'22px 24px',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
      <div onClick={onClick} className={onClick ? 'clickable-tile' : undefined} style={{display:'inline-block',cursor: onClick ? 'pointer' : 'default',marginBottom:'12px'}}>
        <div style={{fontSize:'13px',color:'#6e6e73',fontWeight:'600',marginBottom:'2px'}}>{title}{onClick && ' →'}</div>
        <div style={{fontSize:'32px',fontWeight:'800',color:'#152238',letterSpacing:'-0.8px'}}>{data ? current.toLocaleString() : '—'}</div>
      </div>
      <GrowthChart data={data} color={color}/>
    </div>
  )
}

function DrilldownModal({ title, loading, items, kind, onClose }) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'24px'}}>
      <div onClick={e => e.stopPropagation()} style={{background:'white',borderRadius:'16px',width:'100%',maxWidth:'560px',maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px',borderBottom:'1px solid rgba(0,0,0,0.06)',flexShrink:0}}>
          <div>
            <h2 style={{fontSize:'17px',fontWeight:'700',color:'#152238'}}>{title}</h2>
            {!loading && <span style={{fontSize:'12px',color:'#aeaeb2'}}>{items.length} total</span>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'20px',color:'#aeaeb2',cursor:'pointer',lineHeight:1,padding:'4px'}}>×</button>
        </div>
        <div style={{overflowY:'auto',padding:'8px 24px'}}>
          {loading ? (
            <div style={{color:'#6e6e73',fontSize:'14px',padding:'40px 0',textAlign:'center'}}>Loading...</div>
          ) : items.length === 0 ? (
            <div style={{color:'#aeaeb2',fontSize:'14px',padding:'40px 0',textAlign:'center'}}>Nothing here yet.</div>
          ) : kind === 'users' ? (
            items.map(u => (
              <div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                <span style={{fontSize:'14px',color:'#152238',fontWeight:'600'}}>{u.email}</span>
                <span style={{fontSize:'12px',color:'#aeaeb2'}}>{formatDate(u.created_at)}</span>
              </div>
            ))
          ) : (
            items.map(pub => (
              <div key={pub.id} style={{padding:'14px 0',borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'10px'}}>
                  <span style={{fontSize:'14px',color:'#152238',fontWeight:'700'}}>{pub.name || 'Unnamed venue'}</span>
                  <span style={{fontSize:'10px',fontWeight:'700',letterSpacing:'0.3px',textTransform:'uppercase',padding:'2px 8px',borderRadius:'20px',whiteSpace:'nowrap',
                    color: pub.status === 'approved' ? '#16a34a' : pub.status === 'rejected' ? '#dc2626' : '#e8732a',
                    background: pub.status === 'approved' ? 'rgba(22,163,74,0.1)' : pub.status === 'rejected' ? 'rgba(220,38,38,0.1)' : 'rgba(232,115,42,0.1)'}}>
                    {pub.status}
                  </span>
                </div>
                <div style={{fontSize:'12px',color:'#aeaeb2',marginTop:'2px'}}>{pub.address || 'No address on file'} · Applied {formatDate(pub.created_at)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [growth, setGrowth] = useState(null)
  const [drilldown, setDrilldown] = useState(null)
  const router = useRouter()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: adminCheck } = await supabase.rpc('is_admin')
    if (!adminCheck) { router.push('/'); return }
    setIsAdmin(true)
    setChecking(false)
    loadPending()
    loadStats()
    loadGrowth()
  }

  async function loadPending() {
    setLoading(true)
    const { data } = await supabase.from('pubs').select('*').eq('status', 'pending').order('created_at')
    setPending(data || [])
    setLoading(false)
  }

  async function loadStats() {
    const { data } = await supabase.rpc('admin_stats')
    setStats(data?.[0] || null)
  }

  async function loadGrowth() {
    const { data } = await supabase.rpc('admin_growth_stats')
    setGrowth(data || [])
  }

  async function openDrilldown(kind, title) {
    setDrilldown({ kind, title, loading: true, items: [] })
    if (kind === 'users') {
      const { data } = await supabase.rpc('admin_list_users')
      setDrilldown({ kind, title, loading: false, items: data || [] })
      return
    }
    const query = kind === 'vendors'
      ? supabase.from('pubs').select('*').order('created_at', { ascending: false })
      : supabase.from('pubs').select('*').eq('status', kind).order('created_at', { ascending: false })
    const { data } = await query
    setDrilldown({ kind, title, loading: false, items: data || [] })
  }

  async function approve(pub) {
    setBusyId(pub.id)
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error: fnError } = await supabase.functions.invoke('notify-venue-approved', {
      body: { pub_id: pub.id },
    })
    if (fnError || data?.success === false) {
      setError(`Couldn't approve "${pub.name}" — ${data?.error || fnError?.message || 'unknown error'}`)
      setBusyId(null)
      return
    }
    setPending(p => p.filter(x => x.id !== pub.id))
    setBusyId(null)
    loadStats()
  }

  async function reject(pub) {
    setBusyId(pub.id)
    setError(null)
    const { error: updateError } = await supabase.from('pubs').update({ status: 'rejected' }).eq('id', pub.id)
    if (updateError) {
      setError(`Couldn't reject "${pub.name}" — ${updateError.message}`)
      setBusyId(null)
      return
    }
    setPending(p => p.filter(x => x.id !== pub.id))
    setBusyId(null)
    loadStats()
  }

  if (checking || !isAdmin) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#6e6e73',background:'#f5f5f7'}}>Loading...</div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f7',fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif"}}>
      <style>{`
        * { box-sizing: border-box; }
        @media (hover: hover) and (pointer: fine) {
          .nav-link:hover { background: rgba(0,0,0,0.04) !important; }
          .approve-btn:hover { transform: scale(1.02); }
          .clickable-tile:hover { opacity: 0.75; }
        }
      `}</style>

      {/* Nav */}
      <div style={{background:'rgba(245,245,247,0.72)',borderBottom:'1px solid rgba(0,0,0,0.08)',backdropFilter:'saturate(200%) blur(28px)',WebkitBackdropFilter:'saturate(200%) blur(28px)',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'60px',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <a href="/"><img src="/SportSpot-Logo-Light.png" alt="SportSpot" style={{height:'50px',width:'auto'}}/></a>
          <span style={{background:'rgba(0,0,0,0.05)',color:'#6e6e73',fontSize:'12px',padding:'3px 10px',borderRadius:'20px'}}>Admin</span>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <a href="/" className="nav-link" style={{fontSize:'13px',color:'#6e6e73',padding:'6px 12px',borderRadius:'6px',border:'1px solid rgba(0,0,0,0.1)',whiteSpace:'nowrap'}}>Return to Home Page</a>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="nav-link"
            style={{fontSize:'13px',color:'#6e6e73',background:'none',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'6px',padding:'6px 12px',cursor:'pointer',whiteSpace:'nowrap'}}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{maxWidth:'920px',margin:'0 auto',padding:'32px 24px'}}>
        <h1 style={{fontSize:'24px',fontWeight:'700',color:'#152238',letterSpacing:'-0.5px',marginBottom:'20px'}}>Overview</h1>

        <div style={{display:'flex',gap:'16px',flexWrap:'wrap',marginBottom:'20px'}}>
          <GrowthPanel title="Total Users" data={growth?.map(g => ({ day: g.day, value: g.total_users }))} color="#e8732a"
            onClick={() => openDrilldown('users', 'All Users')}/>
          <GrowthPanel title="Total Vendors" data={growth?.map(g => ({ day: g.day, value: g.total_vendors }))} color="#2a78d6"
            onClick={() => openDrilldown('vendors', 'All Vendors')}/>
        </div>

        <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'32px'}}>
          <StatTile label="Pending" value={stats ? stats.pending_count : '—'} accent="#e8732a" onClick={() => openDrilldown('pending', 'Pending Venues')} />
          <StatTile label="Approved" value={stats ? stats.approved_count : '—'} accent="#16a34a" onClick={() => openDrilldown('approved', 'Approved Venues')} />
          <StatTile label="Rejected" value={stats ? stats.rejected_count : '—'} accent="#dc2626" onClick={() => openDrilldown('rejected', 'Rejected Venues')} />
        </div>

        {drilldown && (
          <DrilldownModal title={drilldown.title} loading={drilldown.loading} items={drilldown.items} kind={drilldown.kind}
            onClose={() => setDrilldown(null)}/>
        )}

        <h2 style={{fontSize:'18px',fontWeight:'700',color:'#152238',letterSpacing:'-0.3px',marginBottom:'4px'}}>Venue applications</h2>
        <p style={{color:'#6e6e73',fontSize:'14px',marginBottom:'20px'}}>{pending.length} waiting for review</p>

        {error && (
          <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',padding:'10px 14px',color:'#dc2626',fontSize:'13px',marginBottom:'20px'}}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{color:'#6e6e73',fontSize:'14px',padding:'40px 0',textAlign:'center'}}>Loading applications...</div>
        ) : pending.length === 0 ? (
          <div style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'48px 24px',textAlign:'center',color:'#aeaeb2',fontSize:'14px'}}>
            No applications waiting — you're all caught up.
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {pending.map(pub => (
              <div key={pub.id} style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'24px',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px'}}>
                  <div>
                    <h2 style={{fontSize:'17px',fontWeight:'700',color:'#152238',marginBottom:'2px'}}>{pub.name || 'Unnamed venue'}</h2>
                    <span style={{fontSize:'12px',color:'#aeaeb2'}}>Applied {formatDate(pub.created_at)}</span>
                  </div>
                </div>

                <div style={{borderTop:'1px solid rgba(0,0,0,0.06)',paddingTop:'12px',marginBottom:'18px'}}>
                  <DetailRow label="Address" value={pub.address} />
                  <DetailRow label="Phone" value={pub.phone} />
                  <DetailRow label="Contact email" value={pub.contact_email} />
                  <DetailRow label="Submitted by" value={pub.submitter_name} />
                  <DetailRow label="Their position" value={pub.submitter_position} />
                  <DetailRow label="Sports packages" value={[pub.has_sky && 'Sky Sports', pub.has_tnt && 'TNT Sports'].filter(Boolean).join(', ') || null} />
                </div>

                <div style={{display:'flex',gap:'10px'}}>
                  <button className="approve-btn" onClick={() => approve(pub)} disabled={busyId === pub.id}
                    style={{flex:1,background:'#e8732a',color:'white',border:'none',borderRadius:'980px',padding:'11px',fontSize:'13px',fontWeight:'700',cursor:'pointer',opacity: busyId === pub.id ? 0.6 : 1,transition:'transform 0.15s ease'}}>
                    {busyId === pub.id ? 'Working...' : 'Approve'}
                  </button>
                  <button onClick={() => reject(pub)} disabled={busyId === pub.id}
                    style={{flex:1,background:'none',color:'#dc2626',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'980px',padding:'11px',fontSize:'13px',fontWeight:'700',cursor:'pointer',opacity: busyId === pub.id ? 0.6 : 1}}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
