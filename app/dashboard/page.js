'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { CheckCircle2, ClipboardList, TrendingUp, Clock } from '../../lib/icons'

const SPORTS = ['All', 'Football', 'Rugby', 'Cricket', 'Tennis']

export default function Dashboard() {
  const [pub, setPub] = useState(null)
  const [fixtures, setFixtures] = useState([])
  const [showings, setShowings] = useState({})
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sportFilter, setSportFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('fixtures')
  const [venueForm, setVenueForm] = useState({})
  const [venueSaved, setVenueSaved] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: adminCheck } = await supabase.rpc('is_admin')
    setIsAdmin(!!adminCheck)
    const { data: pubData } = await supabase.from('pubs').select('*').eq('owner_id', session.user.id).single()
    if (!pubData) { router.push('/setup'); return }
    setPub(pubData)
    if (pubData.status !== 'approved') { setLoading(false); return }
    setVenueForm({ name: pubData.name || '', address: pubData.address || '', has_sky: pubData.has_sky || false, has_tnt: pubData.has_tnt || false })
    const today = new Date().toISOString().split('T')[0]
    const { data: fixtureData } = await supabase.from('fixtures').select('*').eq('fixture_date', today).order('kickoff_time')
    setFixtures(fixtureData || [])
    const { data: showingData } = await supabase.from('showings').select('*').eq('pub_id', pubData.id)
    const map = {}
    showingData?.forEach(s => { map[s.fixture_id] = s.is_showing })
    setShowings(map)
    setLoading(false)
  }

  async function toggleShowing(fixtureId, current) {
    const next = !current
    setShowings(p => ({...p, [fixtureId]: next}))
    await supabase.from('showings').upsert(
      { pub_id: pub.id, fixture_id: fixtureId, is_showing: next, confirmed_at: next ? new Date().toISOString() : null },
      { onConflict: 'pub_id,fixture_id' }
    )
  }

  async function confirmLineup() {
    await supabase.from('pubs').update({ confirmed_at: new Date().toISOString() }).eq('id', pub.id)
    setConfirmed(true)
  }

  async function saveVenueDetails() {
    await supabase.from('pubs').update({
      name: venueForm.name, address: venueForm.address,
      has_sky: venueForm.has_sky, has_tnt: venueForm.has_tnt,
    }).eq('id', pub.id)
    setPub(p => ({...p, ...venueForm}))
    setVenueSaved(true)
    setTimeout(() => setVenueSaved(false), 2000)
  }

  const filteredFixtures = fixtures.filter(f => sportFilter === 'All' || f.sport?.toLowerCase() === sportFilter.toLowerCase())
  const activeCount = fixtures.filter(f => showings[f.id] === true).length
  const topSport = fixtures.length ? fixtures[0]?.sport || 'Football' : 'Football'

  const inputStyle = { width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.8)', border:'1px solid rgba(0,0,0,0.1)', borderRadius:'8px', color:'#152238', fontSize:'15px', marginBottom:'12px', outline:'none', WebkitAppearance:'none' }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#6e6e73',background:'#f5f5f7'}}>Loading...</div>
  )

  if (pub && pub.status !== 'approved') {
    const rejected = pub.status === 'rejected'
    return (
      <div style={{minHeight:'100vh',position:'relative',overflow:'hidden',background:'linear-gradient(135deg, #fff8f3 0%, #ffffff 25%, #f0f4ff 55%, #f8f0ff 80%, #fff5f0 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif"}}>
        <div style={{
          background:'rgba(255,255,255,0.55)',
          backdropFilter:'saturate(200%) blur(32px)',
          WebkitBackdropFilter:'saturate(200%) blur(32px)',
          border:'1px solid rgba(255,255,255,0.7)',
          boxShadow:'0 8px 64px rgba(0,0,0,0.08), 0 2px 0 rgba(255,255,255,0.8) inset',
          borderRadius:'28px',
          padding:'48px 40px',
          width:'100%',
          maxWidth:'440px',
          textAlign:'center',
        }}>
          <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background: rejected ? 'rgba(239,68,68,0.1)' : 'rgba(232,115,42,0.1)',border:`1px solid ${rejected ? 'rgba(239,68,68,0.25)' : 'rgba(232,115,42,0.25)'}`,borderRadius:'980px',padding:'5px 14px',marginBottom:'20px'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background: rejected ? '#dc2626' : '#e8732a'}}/>
            <span style={{fontSize:'12px',color: rejected ? '#dc2626' : '#e8732a',fontWeight:'600',letterSpacing:'0.2px'}}>{rejected ? 'Application not approved' : 'Application under review'}</span>
          </div>
          <h1 style={{color:'#152238',fontSize:'24px',fontWeight:'700',letterSpacing:'-0.5px',marginBottom:'12px'}}>{pub.name}</h1>
          <p style={{color:'#6e6e73',fontSize:'14px',lineHeight:'1.6',marginBottom:'28px'}}>
            {rejected
              ? "We weren't able to approve this application. If you think this is a mistake, get in touch and we'll take another look."
              : "Thanks for applying — we're reviewing your venue's details now. You'll get an email as soon as it's approved, usually within a day or two."}
          </p>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{width:'100%',background:'none',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'980px',padding:'13px',fontSize:'14px',fontWeight:'600',color:'#6e6e73',cursor:'pointer'}}>
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f7',fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif"}}>
      <style>{`
        * { box-sizing: border-box; }
        .input-field:focus { border-color: #e8732a !important; box-shadow: 0 0 0 3px rgba(232,115,42,0.1); outline: none; }
        @media (hover: hover) and (pointer: fine) {
          .nav-link:hover { background: rgba(0,0,0,0.04) !important; }
        }
        @media (max-width: 768px) {
          .dash-nav { padding: 0 16px !important; height: 56px !important; }
          .dash-nav-pub { display: none !important; }
          .dash-content { padding: 20px 16px 32px !important; }
          .dash-title { font-size: 20px !important; }
          .confirm-banner { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .confirm-banner button { width: 100% !important; }
          .main-tabs { width: 100% !important; }
          .main-tabs button { flex: 1 !important; font-size: 12px !important; padding: 8px 10px !important; }
          .sport-filters { gap: 6px !important; }
          .sport-filters button { padding: 7px 12px !important; font-size: 12px !important; }
          .fixture-table-header { display: none !important; }
          .fixture-row { grid-template-columns: 1fr auto !important; gap: 12px !important; padding: 14px 16px !important; }
          .fixture-competition { display: none !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .stats-grid > div:last-child { grid-column: 1 / -1 !important; }
          .venue-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Nav */}
      <div className="dash-nav" style={{background:'rgba(245,245,247,0.72)',borderBottom:'1px solid rgba(0,0,0,0.08)',backdropFilter:'saturate(200%) blur(28px)',WebkitBackdropFilter:'saturate(200%) blur(28px)',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'60px',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <a href="/"><img src="/SportSpot-Logo-Light.png" alt="SportSpot" style={{height:'50px',width:'auto'}}/></a>
          <span className="dash-nav-pub" style={{background:'rgba(0,0,0,0.05)',color:'#6e6e73',fontSize:'12px',padding:'3px 10px',borderRadius:'20px'}}>{pub?.name}</span>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          {isAdmin && (
            <a href="/admin" className="nav-link" style={{fontSize:'13px',color:'#e8732a',padding:'6px 12px',borderRadius:'6px',border:'1px solid rgba(232,115,42,0.3)',background:'rgba(232,115,42,0.06)',fontWeight:'600',whiteSpace:'nowrap'}}>Admin</a>
          )}
          <a href="/map" className="nav-link" style={{fontSize:'13px',color:'#6e6e73',padding:'6px 12px',borderRadius:'6px',border:'1px solid rgba(0,0,0,0.1)',whiteSpace:'nowrap'}}>Fan Map</a>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="nav-link"
            style={{fontSize:'13px',color:'#6e6e73',background:'none',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'6px',padding:'6px 12px',cursor:'pointer',whiteSpace:'nowrap'}}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="dash-content" style={{maxWidth:'1000px',margin:'0 auto',padding:'32px 24px'}}>

        <h1 className="dash-title" style={{fontSize:'24px',fontWeight:'700',letterSpacing:'-0.5px',marginBottom:'4px',color:'#152238'}}>Manager Dashboard</h1>
        <p style={{color:'#6e6e73',fontSize:'14px',marginBottom:'20px'}}>Control which sporting events are showcased on your screens today.</p>

        {/* Confirm banner */}
        <div className="confirm-banner" style={{background: confirmed ? 'rgba(34,197,94,0.08)' : 'rgba(232,115,42,0.08)',border:`1px solid ${confirmed?'rgba(34,197,94,0.3)':'rgba(232,115,42,0.3)'}`,borderRadius:'12px',padding:'16px 20px',marginBottom:'20px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px'}}>
          <div>
            <p style={{fontWeight:'700',color: confirmed ? '#16a34a' : '#e8732a',marginBottom:'2px',fontSize:'14px',display:'flex',alignItems:'center',gap:'6px'}}>
              {confirmed && <CheckCircle2 size={15} strokeWidth={2}/>}
              {confirmed ? 'Lineup confirmed — fans can see your schedule' : "Confirm today's lineup so fans can find you"}
            </p>
            <p style={{color:'#6e6e73',fontSize:'13px',margin:0}}>Unconfirmed venues rank lower in fan searches.</p>
          </div>
          {!confirmed && (
            <button onClick={confirmLineup}
              style={{background:'#e8732a',color:'white',border:'none',borderRadius:'8px',padding:'10px 20px',fontWeight:'700',fontSize:'14px',cursor:'pointer',flexShrink:0,whiteSpace:'nowrap',boxShadow:'0 4px 14px rgba(232,115,42,0.25)'}}>
              Confirm Now
            </button>
          )}
        </div>

        {/* Main tabs */}
        <div className="main-tabs" style={{display:'flex',marginBottom:'20px',background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'10px',padding:'4px',width:'fit-content',boxShadow:'0 2px 8px rgba(0,0,0,0.03)'}}>
          {[
            { id: 'fixtures', label: "Today's Fixtures" },
            { id: 'venue', label: 'Venue Details' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{padding:'8px 20px',borderRadius:'7px',border:'none',fontSize:'13px',fontWeight:'700',cursor:'pointer',
                background: activeTab === tab.id ? '#e8732a' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#6e6e73'}}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* FIXTURES TAB */}
        {activeTab === 'fixtures' && (
          <>
            {/* Sport filters */}
            <div className="sport-filters" style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
              {SPORTS.map(s => (
                <button key={s} onClick={() => setSportFilter(s)}
                  style={{background: sportFilter===s ? '#e8732a' : 'white',color: sportFilter===s ? 'white' : '#6e6e73',border:'1px solid',borderColor: sportFilter===s ? '#e8732a' : 'rgba(0,0,0,0.08)',borderRadius:'8px',padding:'8px 16px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>
                  {s}
                </button>
              ))}
            </div>

            {/* Fixture table — desktop */}
            <div style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'12px',overflow:'hidden',marginBottom:'24px',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>

              {/* Desktop header */}
              <div className="fixture-table-header" style={{display:'grid',gridTemplateColumns:'160px 1fr 1fr 120px',padding:'12px 20px',borderBottom:'1px solid rgba(0,0,0,0.06)',gap:'16px'}}>
                {['DATE & TIME','COMPETITION','MATCHUP','STATUS'].map(h => (
                  <span key={h} style={{fontSize:'10px',fontWeight:'700',letterSpacing:'1.5px',color:'#aeaeb2'}}>{h}</span>
                ))}
              </div>

              {filteredFixtures.length === 0 && (
                <div style={{padding:'40px',textAlign:'center',color:'#aeaeb2',fontSize:'14px'}}>No fixtures for today.</div>
              )}

              {filteredFixtures.map((f, i) => {
                const on = showings[f.id] || false
                const ko = new Date(f.kickoff_time)
                const day = ko.toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short'})
                const time = ko.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})
                return (
                  <div key={f.id} className="fixture-row"
                    style={{display:'grid',gridTemplateColumns:'160px 1fr 1fr 120px',padding:'16px 20px',gap:'16px',borderBottom: i<filteredFixtures.length-1 ? '1px solid rgba(0,0,0,0.06)' : 'none',background: on ? 'rgba(232,115,42,0.04)' : 'transparent',alignItems:'center'}}>

                    {/* Date/time */}
                    <div>
                      <div style={{fontSize:'14px',fontWeight:'600',color: on ? '#e8732a' : '#152238'}}>{day}</div>
                      <div style={{fontSize:'13px',color:'#6e6e73'}}>{time}</div>
                      {/* Mobile-only: show matchup inline */}
                      <div style={{fontSize:'13px',fontWeight:'600',color:'#152238',marginTop:'4px',display:'none'}} className="mobile-matchup">
                        {f.home_team} vs {f.away_team}
                      </div>
                      <div style={{fontSize:'11px',color:'#6e6e73',marginTop:'2px',display:'none'}} className="mobile-comp">
                        {f.competition} · {f.broadcaster}
                      </div>
                    </div>

                    {/* Competition — hidden on mobile via grid reflow */}
                    <div className="fixture-competition">
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#e8732a',flexShrink:0,display:'inline-block'}}/>
                        <span style={{fontSize:'14px',color:'#152238'}}>{f.competition}</span>
                      </div>
                      <div style={{fontSize:'12px',color:'#6e6e73',marginTop:'2px'}}>{f.broadcaster}</div>
                    </div>

                    {/* Matchup */}
                    <div style={{fontSize:'15px',fontWeight:'600',color:'#152238'}}>{f.home_team} vs {f.away_team}</div>

                    {/* Toggle */}
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <span style={{fontSize:'12px',fontWeight:'700',color: on ? '#e8732a' : '#aeaeb2'}}>{on ? 'Showing' : 'Off'}</span>
                      <div onClick={() => toggleShowing(f.id, on)}
                        style={{width:'44px',height:'24px',borderRadius:'12px',background: on ? '#e8732a' : 'rgba(0,0,0,0.12)',position:'relative',cursor:'pointer',transition:'background 0.2s',flexShrink:0}}>
                        <div style={{position:'absolute',top:'2px',left: on ? '22px' : '2px',width:'20px',height:'20px',borderRadius:'50%',background:'white',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div style={{padding:'12px 20px',borderTop:'1px solid rgba(0,0,0,0.06)',color:'#aeaeb2',fontSize:'12px'}}>
                {filteredFixtures.length} fixture{filteredFixtures.length !== 1 ? 's' : ''} today
              </div>
            </div>

            {/* Stats cards */}
            <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
              {[
                { icon:ClipboardList, label:'Active Listings', value: activeCount, sub:'Toggled on today' },
                { icon:TrendingUp, label:'Top Sport', value: topSport.charAt(0).toUpperCase() + topSport.slice(1), sub:'Most scheduled today' },
                { icon:Clock, label:'Total Today', value: fixtures.length, sub:'Fixtures available' },
              ].map(card => (
                <div key={card.label} style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'12px',padding:'20px',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                    <span style={{fontSize:'11px',fontWeight:'700',letterSpacing:'1px',color:'#aeaeb2',textTransform:'uppercase'}}>{card.label}</span>
                    <card.icon size={18} strokeWidth={1.75} color="#e8732a"/>
                  </div>
                  <div style={{fontSize:'28px',fontWeight:'700',color:'#152238',marginBottom:'4px'}}>{card.value}</div>
                  <div style={{fontSize:'12px',color:'#6e6e73'}}>{card.sub}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VENUE DETAILS TAB */}
        {activeTab === 'venue' && (
          <div className="venue-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>

            {/* Venue info */}
            <div style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'12px',padding:'24px',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
              <h2 style={{fontSize:'16px',fontWeight:'700',color:'#152238',marginBottom:'4px'}}>Venue Information</h2>
              <p style={{fontSize:'13px',color:'#6e6e73',marginBottom:'20px'}}>Update your pub name and address shown to fans.</p>
              <label style={{fontSize:'11px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase',color:'#aeaeb2',display:'block',marginBottom:'6px'}}>Pub Name</label>
              <input className="input-field" value={venueForm.name} onChange={e => setVenueForm(p => ({...p, name: e.target.value}))} style={inputStyle} placeholder="e.g. The Crown"/>
              <label style={{fontSize:'11px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase',color:'#aeaeb2',display:'block',marginBottom:'6px'}}>Address</label>
              <input className="input-field" value={venueForm.address} onChange={e => setVenueForm(p => ({...p, address: e.target.value}))} style={inputStyle} placeholder="e.g. 123 High Street, London"/>
            </div>

            {/* Sports packages */}
            <div style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'12px',padding:'24px',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
              <h2 style={{fontSize:'16px',fontWeight:'700',color:'#152238',marginBottom:'4px'}}>Sports Packages</h2>
              <p style={{fontSize:'13px',color:'#6e6e73',marginBottom:'20px'}}>Which live sport subscriptions does your venue hold?</p>
              {[
                { key:'has_sky', label:'Sky Sports', desc:'Premier League, cricket, F1 and more', color:'#0ea5e9' },
                { key:'has_tnt', label:'TNT Sports', desc:'Champions League, rugby, boxing and more', color:'#a855f7' },
              ].map(pkg => (
                <div key={pkg.key} onClick={() => setVenueForm(p => ({...p, [pkg.key]: !p[pkg.key]}))}
                  style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderRadius:'10px',marginBottom:'10px',cursor:'pointer',
                    background: venueForm[pkg.key] ? `${pkg.color}11` : '#f5f5f7',
                    border:`1px solid ${venueForm[pkg.key] ? pkg.color+'44' : 'rgba(0,0,0,0.08)'}`}}>
                  <div>
                    <div style={{fontWeight:'700',fontSize:'14px',color: venueForm[pkg.key] ? pkg.color : '#152238'}}>{pkg.label}</div>
                    <div style={{fontSize:'12px',color:'#6e6e73',marginTop:'2px'}}>{pkg.desc}</div>
                  </div>
                  <div style={{width:'44px',height:'24px',borderRadius:'12px',background: venueForm[pkg.key] ? pkg.color : 'rgba(0,0,0,0.12)',position:'relative',flexShrink:0}}>
                    <div style={{position:'absolute',top:'2px',left: venueForm[pkg.key] ? '22px' : '2px',width:'20px',height:'20px',borderRadius:'50%',background:'white',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Save button */}
            <div style={{gridColumn:'1 / -1'}}>
              <button onClick={saveVenueDetails}
                style={{width:'100%',background: venueSaved ? '#22c55e' : '#e8732a',color:'white',border:'none',borderRadius:'10px',padding:'16px',fontSize:'16px',fontWeight:'700',cursor:'pointer',transition:'background 0.2s',boxShadow:'0 4px 20px rgba(232,115,42,0.25)',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                {venueSaved && <CheckCircle2 size={18} strokeWidth={2}/>}
                {venueSaved ? 'Venue Details Saved!' : 'Save Venue Details'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile fixture row overrides */}
      <style>{`
        @media (max-width: 768px) {
          .fixture-row { grid-template-columns: 1fr auto !important; }
          .fixture-competition { display: none !important; }
          .fixture-row > div:nth-child(3) { display: none !important; }
          .mobile-matchup { display: block !important; }
          .mobile-comp { display: block !important; }
        }
      `}</style>
    </div>
  )
}
