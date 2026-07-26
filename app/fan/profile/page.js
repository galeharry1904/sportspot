'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { Award, CheckCircle2, ChevronDown, FootballIcon, RugbyIcon, CricketIcon, F1Icon, TennisIcon } from '../../../lib/icons'

const SPORT_ICON_MAP = {
  'Football': FootballIcon,
  'Rugby': RugbyIcon,
  'Cricket': CricketIcon,
  'Formula 1': F1Icon,
  'Tennis': TennisIcon,
}

const FOOTBALL_TEAMS = {
  'Premier League': [
    'Arsenal','Aston Villa','Bournemouth','Brentford','Brighton',
    'Chelsea','Crystal Palace','Everton','Fulham','Ipswich',
    'Leicester','Liverpool','Man City','Man United','Newcastle',
    'Nottm Forest','Southampton','Spurs','West Ham','Wolves'
  ],
  'Championship': [
    'Blackburn','Bristol City','Burnley','Cardiff','Coventry',
    'Derby','Hull','Leeds','Luton','Middlesbrough',
    'Millwall','Norwich','Oxford','Plymouth','Preston',
    'QPR','Sheffield United','Sheffield Wed','Stoke','Sunderland',
    'Swansea','Watford','West Brom','Wrexham'
  ]
}

const ALL_SPORTS = ['Football','Rugby','Cricket','Formula 1','Tennis']

function formatMemberSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function FanProfile() {
  const [activeTab, setActiveTab] = useState('personal')
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [teams, setTeams] = useState([])
  const [sports, setSports] = useState([])
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedLeague, setExpandedLeague] = useState('Premier League')
  const router = useRouter()

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { session: sess } } = await supabase.auth.getSession()
    if (!sess) { router.push('/fan/login'); return }
    setSession(sess)
    const { data } = await supabase.from('fan_profiles').select('*').eq('user_id', sess.user.id).single()
    if (data) {
      setProfile(data)
      setFirstName(data.first_name || '')
      setLastName(data.last_name || '')
      setTeams(data.favourite_teams || [])
      setSports(data.favourite_sports || [])
      setNotify(data.notify_email ?? true)
    }
    setLoading(false)
  }

  function toggleTeam(team) {
    setTeams(prev => prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team])
  }

  function toggleSport(sport) {
    setSports(prev => prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport])
  }

  async function saveProfile() {
    if (!session) return
    setSaving(true)
    await supabase.from('fan_profiles').update({
      first_name: firstName,
      last_name: lastName,
      favourite_teams: teams,
      favourite_sports: sports,
      notify_email: notify
    }).eq('user_id', session.user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const memberSince = formatMemberSince(session?.user?.created_at)
  const initials = (firstName || session?.user?.email?.[0] || '?').charAt(0).toUpperCase()
    + (lastName ? lastName.charAt(0).toUpperCase() : '')

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f7'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
        <div style={{width:'40px',height:'40px',border:'2px solid #e8732a',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{color:'#6e6e73',fontSize:'14px',fontWeight:'500'}}>Loading your profile...</span>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f7',color:'#152238',fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif"}}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .tab-btn { transition: all 0.2s ease; }
        .team-pill { transition: all 0.15s ease; }
        .team-pill:hover { transform: translateY(-1px); }
        .sport-card { transition: all 0.2s ease; }
        .sport-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
        .input-field:focus { border-color: #e8732a !important; outline: none; box-shadow: 0 0 0 3px rgba(232,115,42,0.1); }
        .nav-link:hover { background: rgba(0,0,0,0.04) !important; }
        @media (max-width: 768px) {
          .profile-hero { padding: 24px 16px !important; }
          .profile-body { padding: 0 16px 120px !important; }
          .save-bar { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; padding: 16px !important; background: linear-gradient(to top, #f5f5f7 80%, transparent) !important; z-index: 50 !important; }
          .tabs-row { padding: 0 16px !important; }
          .hero-avatar { width: 64px !important; height: 64px !important; font-size: 22px !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{background:'rgba(245,245,247,0.72)',borderBottom:'1px solid rgba(0,0,0,0.08)',padding:'0 32px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,backdropFilter:'saturate(200%) blur(28px)',WebkitBackdropFilter:'saturate(200%) blur(28px)'}}>
        <a href="/"><img src="/SportSpot-Logo-Light.png" alt="SportSpot" style={{height:'48px',width:'auto'}}/></a>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <a href="/map" className="nav-link" style={{color:'#3a3a3c',fontSize:'13px',padding:'7px 14px',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'8px',fontWeight:'500',transition:'all 0.2s'}}>
            Fan Map
          </a>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href='/' }} className="nav-link"
            style={{color:'#3a3a3c',fontSize:'13px',background:'none',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'8px',padding:'7px 14px',cursor:'pointer',fontWeight:'500'}}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Hero header */}
      <div className="profile-hero" style={{background:'linear-gradient(135deg, #fff8f3 0%, #ffffff 40%, #f0f4ff 100%)',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'40px 32px',animation:'fadeUp 0.4s ease'}}>
        <div style={{maxWidth:'760px',margin:'0 auto',display:'flex',alignItems:'center',gap:'24px'}}>

          {/* Avatar */}
          <div className="hero-avatar" style={{width:'80px',height:'80px',borderRadius:'50%',background:'linear-gradient(135deg, #e8732a, #c45e1a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',fontWeight:'800',color:'white',flexShrink:0,boxShadow:'0 8px 32px rgba(232,115,42,0.3)',letterSpacing:'-1px'}}>
            {initials}
          </div>

          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'22px',fontWeight:'700',color:'#152238',marginBottom:'4px',letterSpacing:'-0.5px'}}>
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Your Profile'}
            </div>
            <div style={{fontSize:'13px',color:'#6e6e73',marginBottom:'12px'}}>{session?.user?.email}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
              {memberSince && (
                <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(232,115,42,0.1)',border:'1px solid rgba(232,115,42,0.22)',borderRadius:'20px',padding:'4px 12px'}}>
                  <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#e8732a'}}/>
                  <span style={{fontSize:'12px',color:'#e8732a',fontWeight:'600'}}>Member since {memberSince}</span>
                </div>
              )}
              {teams.length > 0 && (
                <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(255,255,255,0.7)',border:'1px solid rgba(0,0,0,0.08)',borderRadius:'20px',padding:'4px 12px'}}>
                  <span style={{fontSize:'12px',color:'#6e6e73',fontWeight:'600'}}>{teams.length} favourite team{teams.length !== 1 ? 's' : ''}</span>
                </div>
              )}
              {sports.length > 0 && (
                <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(255,255,255,0.7)',border:'1px solid rgba(0,0,0,0.08)',borderRadius:'20px',padding:'4px 12px'}}>
                  <span style={{fontSize:'12px',color:'#6e6e73',fontWeight:'600'}}>{sports.length} sport{sports.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-row" style={{background:'rgba(255,255,255,0.6)',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'0 32px',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)'}}>
        <div style={{maxWidth:'760px',margin:'0 auto',display:'flex',gap:'0'}}>
          {[
            {id:'personal', label:'Personal Info'},
            {id:'sporting', label:'Sporting Preferences'},
          ].map(tab => (
            <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)}
              style={{padding:'16px 24px',fontSize:'14px',fontWeight:'700',border:'none',background:'transparent',cursor:'pointer',
                color: activeTab===tab.id ? '#e8732a' : '#6e6e73',
                borderBottom: activeTab===tab.id ? '2px solid #e8732a' : '2px solid transparent',
                letterSpacing:'0.2px'}}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="profile-body" style={{maxWidth:'760px',margin:'0 auto',padding:'32px 32px 100px',animation:'fadeUp 0.3s ease'}}>

        {/* ── PERSONAL INFO TAB ── */}
        {activeTab === 'personal' && (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

            {/* Name card */}
            <div style={{background:'rgba(255,255,255,0.7)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'28px',position:'relative',overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.04)'}}>
              <div style={{position:'absolute',top:0,right:0,width:'120px',height:'120px',background:'radial-gradient(circle, rgba(232,115,42,0.08) 0%, transparent 70%)',pointerEvents:'none'}}/>
              <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#e8732a',marginBottom:'20px'}}>Identity</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                <div>
                  <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'8px'}}>First Name</label>
                  <input className="input-field" value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. James"
                    style={{width:'100%',padding:'12px 14px',background:'rgba(255,255,255,0.8)',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'10px',color:'#152238',fontSize:'15px',transition:'all 0.2s'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'8px'}}>Last Name</label>
                  <input className="input-field" value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="e.g. Smith"
                    style={{width:'100%',padding:'12px 14px',background:'rgba(255,255,255,0.8)',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'10px',color:'#152238',fontSize:'15px',transition:'all 0.2s'}}/>
                </div>
              </div>
            </div>

            {/* Email card */}
            <div style={{background:'rgba(255,255,255,0.7)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'28px',boxShadow:'0 4px 24px rgba(0,0,0,0.04)'}}>
              <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#e8732a',marginBottom:'20px'}}>Contact</div>
              <div>
                <label style={{display:'block',fontSize:'11px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'8px'}}>Email Address</label>
                <div style={{width:'100%',padding:'12px 14px',background:'rgba(0,0,0,0.03)',border:'1px solid rgba(0,0,0,0.08)',borderRadius:'10px',color:'#6e6e73',fontSize:'15px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span>{session?.user?.email}</span>
                  <span style={{fontSize:'11px',fontWeight:'700',background:'rgba(0,0,0,0.06)',color:'#6e6e73',padding:'3px 8px',borderRadius:'6px',letterSpacing:'0.5px'}}>VERIFIED</span>
                </div>
                <p style={{fontSize:'12px',color:'#aeaeb2',marginTop:'8px',lineHeight:'1.5'}}>Email address is managed through your account and cannot be changed here.</p>
              </div>
            </div>

            {/* Member since card */}
            <div style={{background:'linear-gradient(135deg, rgba(232,115,42,0.08), rgba(255,255,255,0.7))',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(232,115,42,0.18)',borderRadius:'16px',padding:'28px',display:'flex',alignItems:'center',gap:'20px',boxShadow:'0 4px 24px rgba(0,0,0,0.04)'}}>
              <div style={{width:'52px',height:'52px',borderRadius:'14px',background:'linear-gradient(135deg, rgba(232,115,42,0.2), rgba(232,115,42,0.08))',border:'1px solid rgba(232,115,42,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#e8732a'}}>
                <Award size={24} strokeWidth={1.75}/>
              </div>
              <div>
                <div style={{fontSize:'12px',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'#e8732a',marginBottom:'4px'}}>SportSpot Member</div>
                <div style={{fontSize:'20px',fontWeight:'700',color:'#152238',letterSpacing:'-0.3px'}}>Since {memberSince || '—'}</div>
                <div style={{fontSize:'12px',color:'#6e6e73',marginTop:'3px'}}>Thanks for being part of the community</div>
              </div>
            </div>

            {/* Notifications card */}
            <div style={{background:'rgba(255,255,255,0.7)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'28px',boxShadow:'0 4px 24px rgba(0,0,0,0.04)'}}>
              <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#e8732a',marginBottom:'20px'}}>Notifications</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:'700',fontSize:'15px',color:'#152238',marginBottom:'4px'}}>Email Alerts</div>
                  <div style={{fontSize:'13px',color:'#6e6e73',lineHeight:'1.5'}}>Get notified at 9am when your favourite teams are showing at a pub near you today</div>
                </div>
                <div onClick={() => setNotify(p => !p)}
                  style={{width:'48px',height:'26px',borderRadius:'13px',background: notify ? '#e8732a' : 'rgba(0,0,0,0.15)',position:'relative',cursor:'pointer',flexShrink:0,transition:'background 0.25s',boxShadow: notify ? '0 0 12px rgba(232,115,42,0.3)' : 'none'}}>
                  <div style={{position:'absolute',top:'3px',left: notify ? '25px' : '3px',width:'20px',height:'20px',borderRadius:'50%',background:'white',transition:'left 0.25s',boxShadow:'0 1px 4px rgba(0,0,0,0.25)'}}/>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SPORTING PREFERENCES TAB ── */}
        {activeTab === 'sporting' && (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

            {/* Favourite Sports */}
            <div style={{background:'rgba(255,255,255,0.7)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'28px',boxShadow:'0 4px 24px rgba(0,0,0,0.04)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                <div>
                  <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#e8732a',marginBottom:'4px'}}>Sports</div>
                  <div style={{fontSize:'13px',color:'#6e6e73'}}>We use this to personalise your map experience</div>
                </div>
                {sports.length > 0 && <span style={{fontSize:'12px',fontWeight:'700',color:'#e8732a',background:'rgba(232,115,42,0.1)',border:'1px solid rgba(232,115,42,0.25)',borderRadius:'20px',padding:'3px 10px'}}>{sports.length} selected</span>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))',gap:'10px'}}>
                {ALL_SPORTS.map(sport => {
                  const Icon = SPORT_ICON_MAP[sport]
                  const isActive = sports.includes(sport)
                  return (
                    <button key={sport} className="sport-card" onClick={() => toggleSport(sport)}
                      style={{padding:'16px 12px',borderRadius:'12px',border:`1px solid ${isActive ? 'rgba(232,115,42,0.4)' : 'rgba(0,0,0,0.08)'}`,background: isActive ? 'linear-gradient(135deg, rgba(232,115,42,0.14), rgba(232,115,42,0.05))' : 'white',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',boxShadow: isActive ? '0 4px 16px rgba(232,115,42,0.14)' : '0 2px 8px rgba(0,0,0,0.03)',color: isActive ? '#e8732a' : '#6e6e73'}}>
                      <Icon size={22} strokeWidth={1.75}/>
                      <span style={{fontSize:'13px',fontWeight:'700',color: isActive ? '#e8732a' : '#6e6e73'}}>{sport}</span>
                      {isActive && <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#e8732a'}}/>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Football Teams */}
            <div style={{background:'rgba(255,255,255,0.7)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.04)'}}>
              <div style={{padding:'28px 28px 20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#e8732a',marginBottom:'4px'}}>Football · Favourite Teams</div>
                    <div style={{fontSize:'13px',color:'#6e6e73'}}>Green star pins on the fan map show pubs with your teams</div>
                  </div>
                  {teams.length > 0 && <span style={{fontSize:'12px',fontWeight:'700',color:'#e8732a',background:'rgba(232,115,42,0.1)',border:'1px solid rgba(232,115,42,0.25)',borderRadius:'20px',padding:'3px 10px',flexShrink:0}}>{teams.length} selected</span>}
                </div>
              </div>

              {/* League accordion */}
              {Object.entries(FOOTBALL_TEAMS).map(([league, leagueTeams]) => {
                const isOpen = expandedLeague === league
                const selectedInLeague = leagueTeams.filter(t => teams.includes(t)).length
                return (
                  <div key={league} style={{borderTop:'1px solid rgba(0,0,0,0.06)'}}>
                    {/* League header */}
                    <button onClick={() => setExpandedLeague(isOpen ? null : league)}
                      style={{width:'100%',padding:'16px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',background: isOpen ? 'rgba(0,0,0,0.02)' : 'transparent',border:'none',cursor:'pointer',transition:'background 0.2s'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                        <span style={{fontSize:'13px',fontWeight:'700',color: isOpen ? '#152238' : '#6e6e73'}}>{league}</span>
                        {selectedInLeague > 0 && (
                          <span style={{fontSize:'11px',fontWeight:'700',background:'#e8732a',color:'white',borderRadius:'10px',padding:'2px 8px'}}>{selectedInLeague}</span>
                        )}
                      </div>
                      <span style={{color:'#aeaeb2',display:'flex',transition:'transform 0.2s',transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}}><ChevronDown size={16} strokeWidth={2}/></span>
                    </button>

                    {/* Teams grid */}
                    {isOpen && (
                      <div style={{padding:'12px 28px 24px',background:'rgba(0,0,0,0.015)'}}>
                        <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                          {leagueTeams.map(team => {
                            const isSelected = teams.includes(team)
                            return (
                              <button key={team} className="team-pill" onClick={() => toggleTeam(team)}
                                style={{padding:'8px 16px',borderRadius:'20px',border:`1px solid ${isSelected ? '#e8732a' : 'rgba(0,0,0,0.1)'}`,fontSize:'13px',fontWeight:'600',cursor:'pointer',
                                  background: isSelected ? '#e8732a' : 'white',
                                  color: isSelected ? 'white' : '#6e6e73',
                                  boxShadow: isSelected ? '0 2px 8px rgba(232,115,42,0.25)' : 'none'}}>
                                {team}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="save-btn-wrap" style={{marginTop:'24px'}}>
          <button onClick={saveProfile} disabled={saving}
            style={{width:'100%',background: saved ? '#22c55e' : saving ? '#e8a374' : '#e8732a',color:'white',border:'none',borderRadius:'12px',padding:'17px',fontSize:'16px',fontWeight:'700',cursor: saving ? 'default' : 'pointer',transition:'all 0.25s',letterSpacing:'0.3px',boxShadow: saved ? '0 4px 20px rgba(34,197,94,0.3)' : '0 4px 20px rgba(232,115,42,0.25)',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
            {saving ? (
              <>
                <div style={{width:'16px',height:'16px',border:'2px solid white',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                Saving...
              </>
            ) : saved ? <><CheckCircle2 size={18} strokeWidth={2}/> Profile Saved!</> : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
