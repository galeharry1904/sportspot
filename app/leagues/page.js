'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'
import { Award, TrendingUp, Clock, Star } from '../../lib/icons'
import { CURRENT_SEASON as SEASON, CURRENT_SEASON_LABEL as SEASON_LABEL, LAST_SEASON, LAST_SEASON_LABEL } from '../../lib/season'
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
  { name: "Women's Super League", hasTable: true },
  { name: 'FA Cup', hasTable: false },
  { name: 'League Cup', hasTable: false },
  { name: 'Champions League', hasTable: false },
  { name: 'Europa League', hasTable: false },
]

// Competitions the Table tab renders — every one of these appears side by
// side, independent of which pill is selected for Results/Fixtures.
const TABLE_COMPETITIONS = COMPETITIONS.filter(c => c.hasTable).map(c => c.name)

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
  // Table tab shows every TABLE_COMPETITIONS league side by side, independent
  // of selectedCompetition (which only drives Results/Fixtures) — both
  // seasons are loaded once so the toggle below just swaps already-fetched
  // data rather than re-querying.
  const [allStandings, setAllStandings] = useState({})
  const [tableSeason, setTableSeason] = useState(SEASON)
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [fanProfile, setFanProfile] = useState(null)

  useEffect(() => {
    loadData(selectedCompetition)
  }, [selectedCompetition])

  useEffect(() => {
    async function loadAllStandings() {
      const { data } = await supabase
        .from('standings').select('*')
        .in('competition', TABLE_COMPETITIONS).in('season', [SEASON, LAST_SEASON])
        .order('position')
      const grouped = {}
      for (const name of TABLE_COMPETITIONS) {
        grouped[name] = {
          [SEASON]: (data || []).filter(r => r.competition === name && r.season === SEASON),
          [LAST_SEASON]: (data || []).filter(r => r.competition === name && r.season === LAST_SEASON),
        }
      }
      setAllStandings(grouped)
    }
    loadAllStandings()
  }, [])

  // /leagues is public — a fan doesn't need to be logged in to view it, so
  // this looks up their favourite teams without redirecting if there's no session.
  useEffect(() => {
    async function loadFan() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: fp } = await supabase.from('fan_profiles').select('*').eq('user_id', session.user.id).single()
      setFanProfile(fp)
    }
    loadFan()
  }, [])

  function isFavouriteTeam(team) {
    return fanProfile?.favourite_teams?.some(t => team?.includes(t)) || false
  }

  async function loadData(comp) {
    setLoading(true)
    const { data: fixturesData } = await supabase.from('fixtures').select('*').eq('competition', comp)
      .gte('fixture_date', SEASON_START).lt('fixture_date', SEASON_END)
      .order('kickoff_time')
    setFixtures(fixturesData || [])
    setLoading(false)
  }

  const results = fixtures.filter(f => f.status === 'FINISHED').slice().sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time))
  const upcoming = fixtures.filter(f => f.status !== 'FINISHED').slice().sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f7',color:'#152238'}}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .reveal-1 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .reveal-2 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
        @media (prefers-reduced-motion: reduce) {
          .reveal-1, .reveal-2 { animation: none !important; }
        }
        @media (hover: hover) and (pointer: fine) {
          .comp-pill:hover { background: rgba(0,0,0,0.04) !important; }
          .tab-btn:hover { color: #e8732a; }
          .table-row:hover { background: rgba(0,0,0,0.02) !important; }
        }
        @media (max-width: 900px) {
          .tables-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .fixture-row { align-items: flex-start !important; }
          .fixture-teams { flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; }
          .fixture-team { flex: none !important; width: 100% !important; text-align: left !important; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{background:'rgba(245,245,247,0.72)',borderBottom:'1px solid rgba(0,0,0,0.08)',padding:'0 24px',height:'76px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,backdropFilter:'saturate(200%) blur(28px)',WebkitBackdropFilter:'saturate(200%) blur(28px)'}}>
        <Link href="/"><Image src="/New%20Logo.png" alt="SportSpot" width={2085} height={635} style={{height:'72px',width:'auto'}}/></Link>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <a href="/map" style={{fontSize:'13px',color:'#6e6e73',padding:'7px 14px',borderRadius:'8px',border:'1px solid rgba(0,0,0,0.08)',fontWeight:'600',textDecoration:'none'}}>Fan Map</a>
          <a href="/login" style={{fontSize:'13px',color:'#6e6e73',padding:'7px 14px',borderRadius:'8px',border:'1px solid rgba(0,0,0,0.08)',fontWeight:'600',textDecoration:'none'}}>Venue Login</a>
        </div>
      </nav>

      {/* Header */}
      <div className="reveal-1" style={{background:'linear-gradient(135deg, #fff8f3 0%, #ffffff 40%, #f0f4ff 100%)',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'44px 24px'}}>
        <div style={{maxWidth:'980px',margin:'0 auto'}}>
          <h1 style={{fontSize:'38px',fontWeight:'800',letterSpacing:'-1px',margin:'0 0 8px'}}>Leagues, Tables &amp; Results</h1>
          <p style={{fontSize:'16px',color:'#6e6e73',margin:0,maxWidth:'560px',lineHeight:'1.6'}}>
            Full standings and every result from the {SEASON_LABEL} season, synced automatically from live football data.
          </p>
        </div>
      </div>

      <div className="reveal-2" style={{maxWidth:'980px',margin:'0 auto',padding:'32px 24px 80px'}}>

        {/* Competition pills */}
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'24px'}}>
          {COMPETITIONS.map(c => {
            const active = selectedCompetition === c.name
            return (
              <button key={c.name} className="comp-pill" onClick={() => setSelectedCompetition(c.name)}
                style={{padding:'9px 18px',borderRadius:'980px',border:`1px solid ${active ? '#e8732a' : 'rgba(0,0,0,0.09)'}`,background: active ? '#e8732a' : 'white',color: active ? 'white' : '#6e6e73',fontSize:'13px',fontWeight:'700',cursor:'pointer',whiteSpace:'nowrap',transition:'background 0.15s ease, color 0.15s ease, border-color 0.15s ease'}}>
                {c.name}
              </button>
            )
          })}
        </div>

        {/* Sub tabs — Table is a standalone view of every league with a
            table, independent of the pill selected above; Results/Fixtures
            still follow it. */}
        <div style={{display:'flex',gap:'4px',borderBottom:'1px solid rgba(0,0,0,0.08)',marginBottom:'24px'}}>
          {[
            { id:'table', label:'Table', icon: Award },
            { id:'results', label:'Results', icon: TrendingUp },
            { id:'fixtures', label:'Fixtures', icon: Clock },
          ].map(tab => (
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
            {/* TABLE — every league at once, laptop-width gets all three side
                by side; a shared season toggle swaps all of them together,
                since splitting that per-card wouldn't fit alongside three
                leagues. */}
            {activeTab === 'table' && (
              <>
                <div style={{display:'flex',gap:'6px',marginBottom:'18px'}}>
                  {[[SEASON, SEASON_LABEL], [LAST_SEASON, LAST_SEASON_LABEL]].map(([value, label]) => (
                    <button key={value} onClick={() => setTableSeason(value)}
                      style={{padding:'7px 16px',borderRadius:'8px',border:`1px solid ${tableSeason===value ? '#e8732a' : 'rgba(0,0,0,0.09)'}`,background: tableSeason===value ? '#e8732a' : 'white',color: tableSeason===value ? 'white' : '#6e6e73',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="tables-grid" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',alignItems:'start'}}>
                  {TABLE_COMPETITIONS.map(name => (
                    <StandingsTable
                      key={name}
                      standings={allStandings[name]?.[tableSeason] || []}
                      competition={name}
                      title={name}
                      emptyText={`No table data for ${name} in ${tableSeason === SEASON ? SEASON_LABEL : LAST_SEASON_LABEL}.`}
                      isFavouriteTeam={isFavouriteTeam}
                    />
                  ))}
                </div>
              </>
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

// Compact by design — this renders three to a row on laptop widths (see
// .tables-grid), so only the columns that matter at a glance make the cut.
// Full W/D/L used to live here when one competition got the full page width;
// dropped now that there isn't room for them alongside two other leagues.
function StandingsTable({ standings, competition, title, emptyText, isFavouriteTeam }) {
  const hasLegend = competition === 'Premier League' || competition === 'Championship'

  if (standings.length === 0) return (
    <div>
      <div style={{fontSize:'13px',fontWeight:'800',color:'#152238',marginBottom:'10px'}}>{title}</div>
      <EmptyState text={emptyText}/>
    </div>
  )

  return (
    <div>
      <div style={{fontSize:'13px',fontWeight:'800',color:'#152238',marginBottom:'10px'}}>{title}</div>
      <div style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.03)',fontVariantNumeric:'tabular-nums'}}>
        <div className="standings-row" style={{display:'grid',gridTemplateColumns:'24px 1fr 26px 32px',gap:'5px',padding:'10px 12px',borderBottom:'1px solid rgba(0,0,0,0.06)',background:'#fafafa'}}>
          <span style={{fontSize:'9px',fontWeight:'800',letterSpacing:'0.4px',color:'#aeaeb2',textAlign:'center'}}>#</span>
          <span style={{fontSize:'9px',fontWeight:'800',letterSpacing:'0.4px',color:'#aeaeb2',textAlign:'left'}}>Club</span>
          <span style={{fontSize:'9px',fontWeight:'800',letterSpacing:'0.4px',color:'#aeaeb2',textAlign:'center'}}>GD</span>
          <span style={{fontSize:'9px',fontWeight:'800',letterSpacing:'0.4px',color:'#aeaeb2',textAlign:'center'}}>Pts</span>
        </div>
        {standings.map((row, i) => {
          const accent = standingsRowAccent(competition, row.position, standings.length)
          const isYours = isFavouriteTeam?.(row.team)
          return (
            <div key={row.id} className="table-row standings-row" style={{display:'grid',gridTemplateColumns:'24px 1fr 26px 32px',gap:'5px',padding:'9px 12px',alignItems:'center',borderBottom: i < standings.length-1 ? '1px solid rgba(0,0,0,0.05)' : 'none',borderLeft:`3px solid ${accent}`,background: isYours ? 'rgba(232,115,42,0.05)' : 'transparent',transition:'background 0.1s'}}>
              <span style={{fontSize:'11px',fontWeight:'700',color:'#152238',textAlign:'center'}}>{row.position}</span>
              <span style={{display:'flex',alignItems:'center',gap:'5px',overflow:'hidden'}}>
                <span style={{fontSize:'11px',fontWeight:'700',color:'#152238',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.team}</span>
                {isYours && <Star size={9} color="#e8732a" fill="#e8732a" style={{flexShrink:0}}/>}
              </span>
              <span style={{fontSize:'10px',color:'#6e6e73',textAlign:'center'}}>{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</span>
              <span style={{fontSize:'11px',fontWeight:'800',color:'#152238',textAlign:'center'}}>{row.points}</span>
            </div>
          )
        })}
        {hasLegend && (
          <div style={{display:'flex',flexWrap:'wrap',gap:'10px',padding:'10px 12px',borderTop:'1px solid rgba(0,0,0,0.06)',background:'#fafafa'}}>
            {competition === 'Premier League' && (
              <>
                <LegendDot color="#0ea5e9" label="Champions League"/>
                <LegendDot color="#dc2626" label="Relegation"/>
              </>
            )}
            {competition === 'Championship' && (
              <>
                <LegendDot color="#22c55e" label="Automatic promotion"/>
                <LegendDot color="#e8732a" label="Play-offs"/>
                <LegendDot color="#dc2626" label="Relegation"/>
              </>
            )}
          </div>
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
            {group.items.map((f, i) => showScore ? (
              <div key={f.id} style={{padding:'14px 20px',borderBottom: i < group.items.length-1 ? '1px solid rgba(0,0,0,0.05)' : 'none',display:'flex',flexDirection:'column',gap:'4px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
                  <span style={{fontSize:'14px',fontWeight: f.home_score > f.away_score ? '800' : '600',color:'#152238',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.home_team}</span>
                  <span style={{fontSize:'14px',fontWeight:'800',color:'#152238',flexShrink:0}}>{f.home_score}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
                  <span style={{fontSize:'14px',fontWeight: f.away_score > f.home_score ? '800' : '600',color:'#152238',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.away_team}</span>
                  <span style={{fontSize:'14px',fontWeight:'800',color:'#152238',flexShrink:0}}>{f.away_score}</span>
                </div>
              </div>
            ) : (
              <div key={f.id} className="fixture-row" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom: i < group.items.length-1 ? '1px solid rgba(0,0,0,0.05)' : 'none',gap:'12px'}}>
                <div className="fixture-teams" style={{display:'flex',alignItems:'center',gap:'10px',flex:1,minWidth:0}}>
                  <span className="fixture-team" style={{fontSize:'14px',fontWeight:'700',color:'#152238',textAlign:'right',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.home_team}</span>
                  <span style={{fontSize:'12px',color:'#aeaeb2',flexShrink:0}}>vs</span>
                  <span className="fixture-team" style={{fontSize:'14px',fontWeight:'700',color:'#152238',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.away_team}</span>
                </div>
                <span style={{fontSize:'12px',fontWeight:'700',color:'#e8732a',background:'rgba(232,115,42,0.1)',borderRadius:'6px',padding:'4px 10px',flexShrink:0}}>
                  {new Date(f.kickoff_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
