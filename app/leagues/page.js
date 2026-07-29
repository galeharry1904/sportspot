'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Award, TrendingUp, Clock } from '../../lib/icons'
import { CURRENT_SEASON as SEASON, CURRENT_SEASON_LABEL as SEASON_LABEL } from '../../lib/season'
import { standingsRowAccent } from '../../lib/leagueTable'

// A full year starting each July safely brackets one football season
// (Aug-May) without needing exact per-competition boundaries from the API —
// keeps this season's fixtures/results from blending with other seasons
// backfilled into the same table.
const SEASON_START = `${SEASON}-07-01`
const SEASON_END = `${Number(SEASON) + 1}-07-01`

const COMPETITIONS = [
  { name: 'Premier League', hasTable: true },
  { name: 'Championship', hasTable: true },
  { name: 'FA Cup', hasTable: false },
  { name: 'League Cup', hasTable: false },
  { name: 'Champions League', hasTable: false },
  { name: 'Europa League', hasTable: false },
]

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function LeaguesPage() {
  return (
    <Suspense fallback={null}>
      <LeaguesContent/>
    </Suspense>
  )
}

function LeaguesContent() {
  const searchParams = useSearchParams()
  const requestedCompetition = searchParams.get('competition')
  const initialCompetition = COMPETITIONS.some(c => c.name === requestedCompetition) ? requestedCompetition : 'Premier League'

  const [selectedCompetition, setSelectedCompetition] = useState(initialCompetition)
  const [activeTab, setActiveTab] = useState('table')
  const [standings, setStandings] = useState([])
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)

  const competition = COMPETITIONS.find(c => c.name === selectedCompetition)

  useEffect(() => {
    if (!competition.hasTable && activeTab === 'table') setActiveTab('results')
  }, [selectedCompetition])

  useEffect(() => {
    loadData(selectedCompetition)
  }, [selectedCompetition])

  async function loadData(comp) {
    setLoading(true)
    const [{ data: standingsData }, { data: fixturesData }] = await Promise.all([
      supabase.from('standings').select('*').eq('competition', comp).eq('season', SEASON).order('position'),
      supabase.from('fixtures').select('*').eq('competition', comp)
        .gte('fixture_date', SEASON_START).lt('fixture_date', SEASON_END)
        .order('kickoff_time'),
    ])
    setStandings(standingsData || [])
    setFixtures(fixturesData || [])
    setLoading(false)
  }

  const results = fixtures.filter(f => f.status === 'FINISHED').slice().sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time))
  const upcoming = fixtures.filter(f => f.status !== 'FINISHED').slice().sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f7',color:'#152238',fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif"}}>
      <style>{`
        * { box-sizing: border-box; }
        .comp-pill:hover { background: rgba(0,0,0,0.04) !important; }
        .tab-btn:hover { color: #e8732a; }
        .table-row:hover { background: rgba(0,0,0,0.02) !important; }
      `}</style>

      {/* Nav */}
      <nav style={{background:'rgba(245,245,247,0.85)',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'0 24px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,backdropFilter:'saturate(200%) blur(20px)',WebkitBackdropFilter:'saturate(200%) blur(20px)'}}>
        <a href="/"><img src="/SportSpot-Logo-Light.png" alt="SportSpot" style={{height:'44px',width:'auto'}}/></a>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <a href="/map" style={{fontSize:'13px',color:'#6e6e73',padding:'7px 14px',borderRadius:'8px',border:'1px solid rgba(0,0,0,0.08)',fontWeight:'600',textDecoration:'none'}}>Fan Map</a>
          <a href="/login" style={{fontSize:'13px',color:'#6e6e73',padding:'7px 14px',borderRadius:'8px',border:'1px solid rgba(0,0,0,0.08)',fontWeight:'600',textDecoration:'none'}}>Venue Login</a>
        </div>
      </nav>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg, #fff8f3 0%, #ffffff 40%, #f0f4ff 100%)',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'44px 24px'}}>
        <div style={{maxWidth:'980px',margin:'0 auto'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(232,115,42,0.1)',border:'1px solid rgba(232,115,42,0.25)',borderRadius:'980px',padding:'6px 16px',marginBottom:'18px'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#e8732a'}}/>
            <span style={{fontSize:'12px',color:'#e8732a',fontWeight:'700',letterSpacing:'0.3px'}}>{SEASON_LABEL} SEASON</span>
          </div>
          <h1 style={{fontSize:'38px',fontWeight:'800',letterSpacing:'-1px',margin:'0 0 8px'}}>Leagues, Tables &amp; Results</h1>
          <p style={{fontSize:'16px',color:'#6e6e73',margin:0,maxWidth:'560px',lineHeight:'1.6'}}>
            Full standings and every result from the {SEASON_LABEL} season, synced automatically from live football data.
          </p>
        </div>
      </div>

      <div style={{maxWidth:'980px',margin:'0 auto',padding:'32px 24px 80px'}}>

        {/* Competition pills */}
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'24px'}}>
          {COMPETITIONS.map(c => {
            const active = selectedCompetition === c.name
            return (
              <button key={c.name} className="comp-pill" onClick={() => setSelectedCompetition(c.name)}
                style={{padding:'9px 18px',borderRadius:'980px',border:`1px solid ${active ? '#e8732a' : 'rgba(0,0,0,0.09)'}`,background: active ? '#e8732a' : 'white',color: active ? 'white' : '#6e6e73',fontSize:'13px',fontWeight:'700',cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s'}}>
                {c.name}
              </button>
            )
          })}
        </div>

        {/* Sub tabs */}
        <div style={{display:'flex',gap:'4px',borderBottom:'1px solid rgba(0,0,0,0.08)',marginBottom:'24px'}}>
          {[
            competition.hasTable && { id:'table', label:'Table', icon: Award },
            { id:'results', label:'Results', icon: TrendingUp },
            { id:'fixtures', label:'Fixtures', icon: Clock },
          ].filter(Boolean).map(tab => (
            <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'12px 18px',border:'none',background:'transparent',cursor:'pointer',
                fontSize:'13px',fontWeight:'700',color: activeTab===tab.id ? '#e8732a' : '#6e6e73',
                borderBottom: activeTab===tab.id ? '2px solid #e8732a' : '2px solid transparent',transition:'color 0.15s'}}>
              <tab.icon size={14} strokeWidth={2}/>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'#aeaeb2',fontSize:'14px'}}>Loading {selectedCompetition}…</div>
        ) : (
          <>
            {/* TABLE */}
            {activeTab === 'table' && competition.hasTable && (
              standings.length === 0 ? (
                <EmptyState text={`No table data for ${selectedCompetition} yet.`}/>
              ) : (
                <div style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
                  <div style={{display:'grid',gridTemplateColumns:'40px 1fr 36px 36px 36px 36px 48px 52px',gap:'8px',padding:'12px 20px',borderBottom:'1px solid rgba(0,0,0,0.06)',background:'#fafafa'}}>
                    {['#','Club','P','W','D','L','GD','Pts'].map(h => (
                      <span key={h} style={{fontSize:'10px',fontWeight:'800',letterSpacing:'0.5px',color:'#aeaeb2',textAlign: h==='Club' ? 'left':'center'}}>{h}</span>
                    ))}
                  </div>
                  {standings.map((row, i) => {
                    const accent = standingsRowAccent(selectedCompetition, row.position, standings.length)
                    return (
                      <div key={row.id} className="table-row" style={{display:'grid',gridTemplateColumns:'40px 1fr 36px 36px 36px 36px 48px 52px',gap:'8px',padding:'12px 20px',alignItems:'center',borderBottom: i < standings.length-1 ? '1px solid rgba(0,0,0,0.05)' : 'none',borderLeft:`3px solid ${accent}`,transition:'background 0.1s'}}>
                        <span style={{fontSize:'13px',fontWeight:'700',color:'#152238',textAlign:'center'}}>{row.position}</span>
                        <span style={{fontSize:'13px',fontWeight:'700',color:'#152238',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.team}</span>
                        <span style={{fontSize:'12px',color:'#6e6e73',textAlign:'center'}}>{row.played}</span>
                        <span style={{fontSize:'12px',color:'#6e6e73',textAlign:'center'}}>{row.won}</span>
                        <span style={{fontSize:'12px',color:'#6e6e73',textAlign:'center'}}>{row.drawn}</span>
                        <span style={{fontSize:'12px',color:'#6e6e73',textAlign:'center'}}>{row.lost}</span>
                        <span style={{fontSize:'12px',color:'#6e6e73',textAlign:'center'}}>{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</span>
                        <span style={{fontSize:'13px',fontWeight:'800',color:'#152238',textAlign:'center'}}>{row.points}</span>
                      </div>
                    )
                  })}
                  <div style={{display:'flex',flexWrap:'wrap',gap:'16px',padding:'14px 20px',borderTop:'1px solid rgba(0,0,0,0.06)',background:'#fafafa'}}>
                    {selectedCompetition === 'Premier League' && (
                      <>
                        <LegendDot color="#0ea5e9" label="Champions League"/>
                        <LegendDot color="#dc2626" label="Relegation"/>
                      </>
                    )}
                    {selectedCompetition === 'Championship' && (
                      <>
                        <LegendDot color="#22c55e" label="Automatic promotion"/>
                        <LegendDot color="#e8732a" label="Play-offs"/>
                        <LegendDot color="#dc2626" label="Relegation"/>
                      </>
                    )}
                  </div>
                </div>
              )
            )}

            {/* RESULTS */}
            {activeTab === 'results' && (
              results.length === 0 ? (
                <EmptyState text={`No results yet for ${selectedCompetition}.`}/>
              ) : (
                <FixtureList fixtures={results} showScore/>
              )
            )}

            {/* FIXTURES */}
            {activeTab === 'fixtures' && (
              upcoming.length === 0 ? (
                <EmptyState text={`${selectedCompetition}'s ${SEASON_LABEL} season has concluded — no upcoming fixtures in this dataset.`}/>
              ) : (
                <FixtureList fixtures={upcoming}/>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
      <div style={{width:'8px',height:'8px',borderRadius:'2px',background:color}}/>
      <span style={{fontSize:'11px',color:'#6e6e73',fontWeight:'600'}}>{label}</span>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{textAlign:'center',padding:'60px 20px',color:'#aeaeb2',background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px'}}>
      <div style={{fontSize:'14px',fontWeight:'600',color:'#6e6e73'}}>{text}</div>
    </div>
  )
}

function FixtureList({ fixtures, showScore }) {
  const groups = []
  let lastDate = null
  for (const f of fixtures) {
    if (f.fixture_date !== lastDate) {
      groups.push({ date: f.fixture_date, items: [] })
      lastDate = f.fixture_date
    }
    groups[groups.length - 1].items.push(f)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'24px'}}>
      {groups.map(group => (
        <div key={group.date}>
          <div style={{fontSize:'11px',fontWeight:'800',letterSpacing:'0.8px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'10px'}}>
            {formatDate(group.date)}
          </div>
          <div style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'14px',overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
            {group.items.map((f, i) => (
              <div key={f.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom: i < group.items.length-1 ? '1px solid rgba(0,0,0,0.05)' : 'none',gap:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',flex:1,minWidth:0}}>
                  <span style={{fontSize:'14px',fontWeight:'700',color:'#152238',textAlign:'right',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.home_team}</span>
                  {showScore ? (
                    <span style={{fontSize:'14px',fontWeight:'800',color:'#152238',background:'#f5f5f7',borderRadius:'6px',padding:'4px 10px',flexShrink:0,whiteSpace:'nowrap'}}>
                      {f.home_score} – {f.away_score}
                    </span>
                  ) : (
                    <span style={{fontSize:'12px',color:'#aeaeb2',flexShrink:0}}>vs</span>
                  )}
                  <span style={{fontSize:'14px',fontWeight:'700',color:'#152238',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.away_team}</span>
                </div>
                {!showScore && (
                  <span style={{fontSize:'12px',fontWeight:'700',color:'#e8732a',background:'rgba(232,115,42,0.1)',borderRadius:'6px',padding:'4px 10px',flexShrink:0}}>
                    {new Date(f.kickoff_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
