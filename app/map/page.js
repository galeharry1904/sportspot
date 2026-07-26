'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps'
import { supabase } from '../../lib/supabase'
import { SportIcon, Star, Tv, MapPin, X, Check, ChevronDown, ChevronUp, ChevronRight, ArrowRight, PIN_STAR_GLYPH, PIN_TV_GLYPH } from '../../lib/icons'

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2-lat1) * Math.PI / 180
  const dLon = (lon2-lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2)
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 0.621371).toFixed(1)
}

const LEAGUE_ORDER = [
  'Premier League','Championship','FA Cup','League Cup',
  'UEFA Champions League','UEFA Europa League',
  'FIFA World Cup','European Championship',
  'Premiership Rugby','Six Nations','Formula 1','Cricket'
]

function sortLeagues(leagues) {
  return [...leagues].sort((a, b) => {
    const ai = LEAGUE_ORDER.indexOf(a), bi = LEAGUE_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1; if (bi === -1) return -1
    return ai - bi
  })
}

const SHEET_PEEK = 88
const SHEET_HALF = 0.52
const SHEET_FULL = 0.92

export default function FanMap() {
  const [infoTab, setInfoTab] = useState('fixtures')
  const [pubs, setPubs] = useState([])
  const [showings, setShowings] = useState([])
  const [selectedPub, setSelectedPub] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fanProfile, setFanProfile] = useState(null)
  const [fanSession, setFanSession] = useState(null)
  const [fanPanelOpen, setFanPanelOpen] = useState(false)
  const [selectedSport, setSelectedSport] = useState(null)
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [selectedFixtureIds, setSelectedFixtureIds] = useState([])
  const [isMobile, setIsMobile] = useState(false)
  const [sheetState, setSheetState] = useState('peek')
  const [mobileTab, setMobileTab] = useState('venues')
  const [mobilePubDetail, setMobilePubDetail] = useState(null)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [desktopListTab, setDesktopListTab] = useState('all') // 'favourites' | 'all'
  const filterRef = useRef(null)
  const sheetRef = useRef(null)
  const dragStartY = useRef(null)
  const dragStartState = useRef(null)
  const router = useRouter()

  const mapCenter = userLocation || { lat: 51.5074, lng: -0.1278 }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    loadData()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      )
    }
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadData() {
    const { data: pubData } = await supabase.from('pubs').select('*')
    setPubs(pubData || [])
    const { data: showingData } = await supabase.from('showings').select('*, fixtures(*), pubs(*)').eq('is_showing', true)
    setShowings(showingData || [])
    const { data: { session: fanSess } } = await supabase.auth.getSession()
    if (!fanSess) { router.push('/fan/login'); return }
    setFanSession(fanSess)
    const { data: fp } = await supabase.from('fan_profiles').select('*').eq('user_id', fanSess.user.id).single()
    setFanProfile(fp)
    setLoading(false)
  }

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const validShowings = showings.filter(s => s.fixtures && new Date(s.fixtures.kickoff_time) > twoHoursAgo)

  const availableSports = [...new Set(
    validShowings.map(s => s.fixtures?.sport).filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1))
  )].sort()

  const availableLeagues = selectedSport ? sortLeagues([...new Set(
    validShowings.filter(s => s.fixtures?.sport?.toLowerCase() === selectedSport.toLowerCase())
      .map(s => s.fixtures?.competition).filter(Boolean)
  )]) : []

  const leagueFixtures = selectedLeague ? [...new globalThis.Map(
    validShowings.filter(s => s.fixtures?.competition === selectedLeague)
      .map(s => s.fixtures).filter(Boolean).map(f => [f.id, f])
  ).values()].sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time)) : []

  const activePubIds = [...new Set(validShowings.map(s => s.pub_id))]
  let activePubs = pubs.filter(p => activePubIds.includes(p.id))

  if (selectedFixtureIds.length > 0) {
    const s = new Set(validShowings.filter(s => selectedFixtureIds.includes(s.fixture_id)).map(s => s.pub_id))
    activePubs = activePubs.filter(p => s.has(p.id))
  } else if (selectedLeague) {
    const s = new Set(validShowings.filter(s => s.fixtures?.competition === selectedLeague).map(s => s.pub_id))
    activePubs = activePubs.filter(p => s.has(p.id))
  } else if (selectedSport) {
    const s = new Set(validShowings.filter(s => s.fixtures?.sport?.toLowerCase() === selectedSport.toLowerCase()).map(s => s.pub_id))
    activePubs = activePubs.filter(p => s.has(p.id))
  }

  if (userLocation) {
    activePubs = [...activePubs].sort((a, b) =>
      getDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude) -
      getDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
    )
  }

  // Favourite pubs — pubs showing a fan's favourite teams
  const favouritePubs = activePubs.filter(p => isFavouritePub(p))
  const hasFavourites = fanProfile?.favourite_teams?.length > 0 && favouritePubs.length > 0

  function getFixturesForPub(pubId) {
    return validShowings.filter(s => s.pub_id === pubId).map(s => s.fixtures).filter(Boolean)
      .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
  }

  function isFavouritePub(pub) {
    if (!fanProfile?.favourite_teams?.length) return false
    return getFixturesForPub(pub.id).some(f =>
      fanProfile.favourite_teams.some(t => f.home_team?.includes(t) || f.away_team?.includes(t))
    )
  }

  function selectPub(pub) {
    setSelectedPub(pub)
    setInfoTab('fixtures')
    if (isMobile) { setMobilePubDetail(pub); setSheetState('half') }
  }

  function toggleFixture(id) {
    setSelectedFixtureIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function handleSelectSport(sport) {
    setSelectedSport(sport === selectedSport ? null : sport)
    setSelectedLeague(null); setSelectedFixtureIds([])
  }
  function handleSelectLeague(league) {
    setSelectedLeague(league === selectedLeague ? null : league)
    setSelectedFixtureIds([])
  }
  function resetFilters() {
    setSelectedSport(null); setSelectedLeague(null); setSelectedFixtureIds([])
    setFilterDropdownOpen(false)
  }

  function onDragStart(clientY) { dragStartY.current = clientY; dragStartState.current = sheetState }
  function onDragEnd(clientY) {
    if (dragStartY.current === null) return
    const dy = dragStartY.current - clientY
    if (dy > 60) setSheetState(dragStartState.current === 'peek' ? 'half' : 'full')
    else if (dy < -60) setSheetState(dragStartState.current === 'full' ? 'half' : 'peek')
    dragStartY.current = null
  }

  function getSheetHeight() {
    if (sheetState === 'peek') return SHEET_PEEK
    if (sheetState === 'half') return Math.round(window.innerHeight * SHEET_HALF)
    return Math.round(window.innerHeight * SHEET_FULL)
  }

  const activeFiltersCount = (selectedSport ? 1 : 0) + (selectedLeague ? 1 : 0) + selectedFixtureIds.length
  const displayedPubs = desktopListTab === 'favourites' ? favouritePubs : activePubs

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f5f5f7',gap:'16px'}}>
      <div style={{width:'36px',height:'36px',border:'2px solid #e8732a',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{color:'#8e8e93',fontSize:'13px',fontWeight:'500',letterSpacing:'0.5px'}}>Finding pubs near you...</span>
    </div>
  )

  // ─── SHARED PUB CARD ────────────────────────────────────────────────────────
  function PubCard({ pub, isSelected, compact = false }) {
    const pubFixtures = getFixturesForPub(pub.id)
    const dist = userLocation ? getDistance(userLocation.lat, userLocation.lng, pub.latitude, pub.longitude) : null
    const isFav = isFavouritePub(pub)
    const displayFixtures = selectedFixtureIds.length > 0
      ? pubFixtures.filter(f => selectedFixtureIds.includes(f.id))
      : selectedLeague ? pubFixtures.filter(f => f.competition === selectedLeague) : pubFixtures

    return (
      <div onClick={() => selectPub(pub)}
        style={{
          background: isSelected ? 'rgba(232,115,42,0.05)' : 'white',
          border: `1px solid ${isSelected ? '#e8732a55' : isFav ? '#16a34a33' : 'rgba(0,0,0,0.06)'}`,
          borderRadius: '14px', marginBottom: compact ? '8px' : '10px',
          cursor: 'pointer', overflow: 'hidden', transition: 'all 0.15s ease',
          boxShadow: isSelected ? '0 0 0 1px #e8732a33, 0 4px 20px rgba(232,115,42,0.1)' :
                     isFav ? '0 0 0 1px #16a34a22, 0 2px 10px rgba(0,0,0,0.03)' : '0 2px 10px rgba(0,0,0,0.03)'
        }}>
        <div style={{padding: compact ? '12px 14px 10px' : '14px 16px 10px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px'}}>
                {isFav && (
                  <div style={{width:'18px',height:'18px',borderRadius:'50%',background:'linear-gradient(135deg,#22c55e,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'white'}}>
                    <Star size={9} strokeWidth={2} fill="white"/>
                  </div>
                )}
                <div style={{fontWeight:'700',fontSize: compact ? '13px' : '14px',color:'#1d1d1f',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',letterSpacing:'-0.1px'}}>{pub.name}</div>
              </div>
              <div style={{fontSize:'11px',color:'#aeaeb2',display:'flex',alignItems:'center',gap:'4px'}}>
                <MapPin size={11} strokeWidth={2} color="#c7c7cc"/>
                <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pub.address}</span>
                {dist && <span style={{flexShrink:0,color:'#6e6e73',fontWeight:'600',marginLeft:'2px'}}>· {dist} mi</span>}
              </div>
            </div>
            <div style={{display:'flex',gap:'4px',flexShrink:0,alignItems:'center'}}>
              {pub.has_sky && <span style={{fontSize:'9px',fontWeight:'800',background:'#0ea5e912',color:'#0ea5e9',border:'1px solid #0ea5e930',borderRadius:'5px',padding:'2px 6px',letterSpacing:'0.3px'}}>SKY</span>}
              {pub.has_tnt && <span style={{fontSize:'9px',fontWeight:'800',background:'#a855f712',color:'#a855f7',border:'1px solid #a855f730',borderRadius:'5px',padding:'2px 6px',letterSpacing:'0.3px'}}>TNT</span>}
            </div>
          </div>
        </div>
        {displayFixtures.length > 0 && (
          <div style={{borderTop:'1px solid rgba(0,0,0,0.05)',padding: compact ? '6px 14px 10px' : '8px 16px 12px'}}>
            {displayFixtures.slice(0, compact ? 1 : 99).map((f, i) => {
              const time = new Date(f.kickoff_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
              return (
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom: i < displayFixtures.length-1 && !compact ? '1px solid rgba(0,0,0,0.05)' : 'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',flex:1,minWidth:0}}>
                    <SportIcon sport={f.sport}/>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:'12px',fontWeight:'700',color:'#3a3a3c',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.home_team} vs {f.away_team}</div>
                      {!compact && <div style={{fontSize:'10px',color:'#aeaeb2',marginTop:'1px'}}>{f.competition}</div>}
                    </div>
                  </div>
                  <div style={{flexShrink:0,marginLeft:'8px',background:'#e8732a12',border:'1px solid #e8732a28',borderRadius:'5px',padding:'2px 8px',fontSize:'11px',fontWeight:'700',color:'#e8732a'}}>{time}</div>
                </div>
              )
            })}
            {compact && displayFixtures.length > 1 && (
              <div style={{fontSize:'10px',color:'#aeaeb2',marginTop:'4px'}}>+{displayFixtures.length - 1} more fixture{displayFixtures.length > 2 ? 's' : ''}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── SHARED INFOWINDOW ──────────────────────────────────────────────────────
  function PubInfoWindow({ pub }) {
    const fixtures = getFixturesForPub(pub.id)
    return (
      <div style={{width:'300px',fontFamily:'system-ui,sans-serif',overflow:'hidden',borderRadius:'10px',border:'1px solid #e8732a30',background:'white'}}>
        <div style={{background:'linear-gradient(135deg,#fff8f3,#f8f0ff)',padding:'14px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
          <div style={{flex:1,paddingRight:'8px'}}>
            <div style={{fontWeight:'800',fontSize:'15px',color:'#1d1d1f',lineHeight:'1.2',marginBottom:'4px',letterSpacing:'-0.2px'}}>{pub.name}</div>
            <div style={{fontSize:'11px',color:'#8e8e93',display:'flex',alignItems:'center',gap:'4px'}}><MapPin size={11} strokeWidth={2}/><span>{pub.address}</span></div>
          </div>
          <button onClick={() => setSelectedPub(null)} style={{background:'white',border:'1px solid rgba(0,0,0,0.08)',borderRadius:'50%',width:'26px',height:'26px',color:'#8e8e93',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><X size={13} strokeWidth={2}/></button>
        </div>
        <div style={{display:'flex',background:'white',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
          {[{id:'fixtures',label:'Live Sport'},{id:'info',label:'Pub Info'}].map(tab => (
            <button key={tab.id} onClick={() => setInfoTab(tab.id)}
              style={{flex:1,padding:'10px',fontSize:'11px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase',border:'none',cursor:'pointer',
                background: infoTab===tab.id ? '#f5f5f7' : 'transparent',
                color: infoTab===tab.id ? '#e8732a' : '#aeaeb2',
                borderBottom: infoTab===tab.id ? '2px solid #e8732a' : '2px solid transparent'}}>
              {tab.label}
            </button>
          ))}
        </div>
        {infoTab === 'fixtures' && (
          <div style={{background:'white',padding:'12px 16px',maxHeight:'220px',overflowY:'auto',scrollbarWidth:'none'}}>
            <div style={{display:'flex',gap:'6px',marginBottom:'12px'}}>
              {pub.has_sky && <div style={{background:'#0ea5e911',border:'1px solid #0ea5e930',borderRadius:'6px',padding:'3px 10px',fontSize:'11px',fontWeight:'700',color:'#0ea5e9'}}>Sky Sports</div>}
              {pub.has_tnt && <div style={{background:'#a855f711',border:'1px solid #a855f730',borderRadius:'6px',padding:'3px 10px',fontSize:'11px',fontWeight:'700',color:'#a855f7'}}>TNT Sports</div>}
              {!pub.has_sky && !pub.has_tnt && <div style={{fontSize:'12px',color:'#aeaeb2'}}>No providers listed</div>}
            </div>
            {fixtures.length === 0 ? (
              <div style={{fontSize:'12px',color:'#aeaeb2',textAlign:'center',padding:'12px 0'}}>No confirmed fixtures today</div>
            ) : fixtures.map((f, i) => {
              const time = new Date(f.kickoff_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
              return (
                <div key={i} style={{padding:'8px 0',borderTop: i>0?'1px solid rgba(0,0,0,0.06)':'none'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <SportIcon sport={f.sport}/>
                      <span style={{fontSize:'11px',fontWeight:'700',color:'#e8732a',textTransform:'uppercase',letterSpacing:'0.5px'}}>{f.competition}</span>
                    </div>
                    <span style={{fontSize:'11px',fontWeight:'700',color:'#1d1d1f',background:'#f5f5f7',padding:'2px 8px',borderRadius:'4px'}}>{time}</span>
                  </div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#3a3a3c',paddingLeft:'20px'}}>{f.home_team} vs {f.away_team}</div>
                  <div style={{fontSize:'11px',color:'#aeaeb2',paddingLeft:'20px',marginTop:'2px'}}>{f.broadcaster}</div>
                </div>
              )
            })}
          </div>
        )}
        {infoTab === 'info' && (
          <div style={{background:'white',padding:'14px 16px'}}>
            <div style={{fontSize:'9px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'12px'}}>Facilities</div>
            {['Bar','Outdoor Seating','Pool Table','Food Served'].map(item => (
              <div key={item} style={{display:'flex',alignItems:'center',gap:'10px',padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
                <div style={{width:'4px',height:'4px',borderRadius:'50%',background:'#e8732a',flexShrink:0}}/>
                <span style={{fontSize:'13px',color:'#6e6e73',fontWeight:'500'}}>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── MOBILE ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    const sheetH = getSheetHeight()
    return (
      <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#f5f5f7',overflow:'hidden'}}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Mobile nav */}
        <div style={{background:'rgba(255,255,255,0.75)',backdropFilter:'saturate(200%) blur(20px)',WebkitBackdropFilter:'saturate(200%) blur(20px)',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'0 16px',height:'52px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,zIndex:10}}>
          <a href="/"><img src="/SportSpot Logo Updated.png" alt="SportSpot" style={{height:'36px',width:'auto'}}/></a>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            {activeFiltersCount > 0 && (
              <div style={{background:'#e8732a',borderRadius:'20px',padding:'4px 12px',fontSize:'11px',fontWeight:'700',color:'white',letterSpacing:'0.3px'}}>
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
              </div>
            )}
            {fanSession && (
              <button onClick={() => setFanPanelOpen(p => !p)}
                style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#e8732a,#c45e1a)',border:'none',color:'white',fontWeight:'800',fontSize:'13px',cursor:'pointer',boxShadow:'0 2px 8px rgba(232,115,42,0.3)'}}>
                {fanSession.user.email[0].toUpperCase()}
              </button>
            )}
          </div>
        </div>

        {/* Map */}
        <div style={{flex:1,position:'relative'}}>
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}>
            <Map defaultCenter={mapCenter} defaultZoom={13} mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}
              style={{width:'100%',height:'100%'}} colorScheme="LIGHT" gestureHandling="greedy">
              {activePubs.map(pub => (
                <AdvancedMarker key={pub.id} position={{lat:pub.latitude,lng:pub.longitude}} onClick={() => selectPub(pub)}>
                  <Pin
                    background={selectedPub?.id===pub.id ? '#e8732a' : isFavouritePub(pub) ? '#22c55e' : 'white'}
                    borderColor={isFavouritePub(pub) ? '#16a34a' : '#e8732a'}
                    glyphColor="white"
                    glyphSrc={isFavouritePub(pub) ? PIN_STAR_GLYPH : PIN_TV_GLYPH}
                  />
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
          <div style={{position:'absolute',top:'12px',left:'50%',transform:'translateX(-50%)',background:'rgba(255,255,255,0.85)',backdropFilter:'blur(12px)',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'20px',padding:'7px 16px',fontSize:'12px',fontWeight:'700',color:'#3a3a3c',pointerEvents:'none',zIndex:5,letterSpacing:'0.3px',boxShadow:'0 4px 16px rgba(0,0,0,0.06)'}}>
            {activePubs.length} venue{activePubs.length !== 1 ? 's' : ''} showing sport
          </div>
        </div>

        {/* Bottom sheet */}
        <div ref={sheetRef}
          style={{position:'fixed',bottom:0,left:0,right:0,height:`${sheetH}px`,background:'rgba(255,255,255,0.92)',backdropFilter:'saturate(200%) blur(24px)',WebkitBackdropFilter:'saturate(200%) blur(24px)',borderTopLeftRadius:'20px',borderTopRightRadius:'20px',borderTop:'1px solid rgba(0,0,0,0.06)',zIndex:200,transition:dragStartY.current?'none':'height 0.3s cubic-bezier(0.4,0,0.2,1)',display:'flex',flexDirection:'column',boxShadow:'0 -12px 40px rgba(0,0,0,0.12)'}}
          onTouchStart={e => onDragStart(e.touches[0].clientY)}
          onTouchEnd={e => onDragEnd(e.changedTouches[0].clientY)}>

          <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',paddingTop:'12px',paddingBottom:'4px',cursor:'grab'}}
            onTouchStart={e => onDragStart(e.touches[0].clientY)}
            onTouchEnd={e => onDragEnd(e.changedTouches[0].clientY)}>
            <div style={{width:'32px',height:'3px',borderRadius:'2px',background:'rgba(0,0,0,0.15)'}}/>
          </div>

          <div style={{flexShrink:0,display:'flex',padding:'8px 16px 0',gap:'4px',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
            {[
              {id:'venues', label:`Venues (${activePubs.length})`},
              {id:'favourites', label: hasFavourites ? `Your Teams (${favouritePubs.length})` : 'Your Teams'},
              {id:'filters', label: activeFiltersCount > 0 ? `Filters · ${activeFiltersCount}` : 'Filters'},
            ].map(tab => (
              <button key={tab.id} onClick={() => { setMobileTab(tab.id); if (sheetState==='peek') setSheetState('half') }}
                style={{padding:'8px 12px',borderRadius:'8px 8px 0 0',border:'none',fontSize:'12px',fontWeight:'700',cursor:'pointer',whiteSpace:'nowrap',
                  background: mobileTab===tab.id ? 'rgba(0,0,0,0.04)' : 'transparent',
                  color: mobileTab===tab.id ? '#e8732a' : '#aeaeb2',
                  borderBottom: mobileTab===tab.id ? '2px solid #e8732a' : '2px solid transparent'}}>
                {tab.label}
              </button>
            ))}
            <button onClick={() => setSheetState(s => s==='full'?'half':s==='half'?'peek':'half')}
              style={{marginLeft:'auto',background:'none',border:'none',color:'#aeaeb2',cursor:'pointer',padding:'4px 8px',display:'flex',alignItems:'center'}}>
              {sheetState==='full'?<ChevronDown size={16} strokeWidth={2}/>:<ChevronUp size={16} strokeWidth={2}/>}
            </button>
          </div>

          {sheetState !== 'peek' && (
            <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch'}}>

              {/* VENUES TAB */}
              {mobileTab === 'venues' && (
                <div style={{padding:'12px'}}>
                  {mobilePubDetail ? (
                    <div style={{background:'white',border:'1px solid #e8732a30',borderRadius:'14px',marginBottom:'12px',overflow:'hidden',animation:'fadeIn 0.2s ease',boxShadow:'0 4px 20px rgba(0,0,0,0.05)'}}>
                      <div style={{padding:'14px 16px 12px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:'800',fontSize:'15px',color:'#1d1d1f',marginBottom:'4px',letterSpacing:'-0.2px'}}>{mobilePubDetail.name}</div>
                          <div style={{fontSize:'12px',color:'#8e8e93'}}>{mobilePubDetail.address}</div>
                          {userLocation && <div style={{fontSize:'11px',color:'#e8732a',marginTop:'3px',fontWeight:'700'}}>{getDistance(userLocation.lat,userLocation.lng,mobilePubDetail.latitude,mobilePubDetail.longitude)} mi away</div>}
                        </div>
                        <button onClick={() => setMobilePubDetail(null)} style={{background:'#f5f5f7',border:'none',borderRadius:'50%',width:'28px',height:'28px',color:'#8e8e93',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><X size={14} strokeWidth={2}/></button>
                      </div>
                      <div style={{display:'flex',gap:'6px',padding:'0 16px 12px'}}>
                        {mobilePubDetail.has_sky && <div style={{background:'#0ea5e911',border:'1px solid #0ea5e930',borderRadius:'6px',padding:'3px 10px',fontSize:'11px',fontWeight:'700',color:'#0ea5e9'}}>Sky Sports</div>}
                        {mobilePubDetail.has_tnt && <div style={{background:'#a855f711',border:'1px solid #a855f730',borderRadius:'6px',padding:'3px 10px',fontSize:'11px',fontWeight:'700',color:'#a855f7'}}>TNT Sports</div>}
                      </div>
                      <div style={{display:'flex',background:'#f5f5f7',borderTop:'1px solid rgba(0,0,0,0.06)',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
                        {[{id:'fixtures',label:'Live Sport'},{id:'info',label:'Pub Info'}].map(tab => (
                          <button key={tab.id} onClick={() => setInfoTab(tab.id)}
                            style={{flex:1,padding:'10px',fontSize:'11px',fontWeight:'700',letterSpacing:'1px',textTransform:'uppercase',border:'none',cursor:'pointer',
                              background: infoTab===tab.id?'white':'transparent',
                              color: infoTab===tab.id?'#e8732a':'#aeaeb2',
                              borderBottom: infoTab===tab.id?'2px solid #e8732a':'2px solid transparent'}}>
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      {infoTab === 'fixtures' && (
                        <div style={{padding:'10px 16px 14px'}}>
                          {getFixturesForPub(mobilePubDetail.id).length === 0
                            ? <div style={{fontSize:'12px',color:'#aeaeb2',textAlign:'center',padding:'12px 0'}}>No confirmed fixtures today</div>
                            : getFixturesForPub(mobilePubDetail.id).map((f,i) => {
                              const time = new Date(f.kickoff_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
                              return (
                                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderTop:i>0?'1px solid rgba(0,0,0,0.06)':'none'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:'7px',flex:1,minWidth:0}}>
                                    <SportIcon sport={f.sport}/>
                                    <div style={{minWidth:0}}>
                                      <div style={{fontSize:'13px',fontWeight:'700',color:'#1d1d1f',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.home_team} vs {f.away_team}</div>
                                      <div style={{fontSize:'11px',color:'#aeaeb2'}}>{f.competition}</div>
                                    </div>
                                  </div>
                                  <div style={{flexShrink:0,marginLeft:'8px',background:'#e8732a12',border:'1px solid #e8732a28',borderRadius:'5px',padding:'3px 10px',fontSize:'12px',fontWeight:'700',color:'#e8732a'}}>{time}</div>
                                </div>
                              )
                            })}
                        </div>
                      )}
                      {infoTab === 'info' && (
                        <div style={{padding:'12px 16px 16px'}}>
                          <div style={{fontSize:'9px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'10px'}}>Facilities</div>
                          {['Bar','Outdoor Seating','Pool Table','Food Served'].map(item => (
                            <div key={item} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
                              <div style={{width:'4px',height:'4px',borderRadius:'50%',background:'#e8732a',flexShrink:0}}/>
                              <span style={{fontSize:'13px',color:'#6e6e73',fontWeight:'500'}}>{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {activePubs.length === 0
                        ? <div style={{textAlign:'center',padding:'48px 20px',color:'#aeaeb2'}}><div style={{display:'flex',justifyContent:'center',marginBottom:'12px'}}><Tv size={30} strokeWidth={1.5}/></div><div style={{fontSize:'14px',fontWeight:'600',color:'#6e6e73',marginBottom:'6px'}}>{selectedSport?'No venues meet filter requirements':'No venues confirmed yet'}</div><div style={{fontSize:'12px'}}>{selectedSport?'Try different filters.':'Check back closer to kick-off.'}</div></div>
                        : activePubs.map(pub => <PubCard key={pub.id} pub={pub} isSelected={mobilePubDetail?.id===pub.id} compact />)
                      }
                    </div>
                  )}
                </div>
              )}

              {/* YOUR TEAMS TAB */}
              {mobileTab === 'favourites' && (
                <div style={{padding:'12px'}}>
                  {!fanProfile?.favourite_teams?.length ? (
                    <div style={{textAlign:'center',padding:'40px 20px'}}>
                      <div style={{display:'flex',justifyContent:'center',marginBottom:'12px',color:'#e8732a'}}><Star size={30} strokeWidth={1.5}/></div>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'#6e6e73',marginBottom:'8px'}}>No favourite teams set</div>
                      <a href="/fan/profile" style={{display:'inline-block',background:'#e8732a',color:'white',borderRadius:'8px',padding:'10px 20px',fontSize:'13px',fontWeight:'700'}}>Set Favourite Teams</a>
                    </div>
                  ) : favouritePubs.length === 0 ? (
                    <div style={{textAlign:'center',padding:'40px 20px',color:'#aeaeb2'}}>
                      <div style={{display:'flex',justifyContent:'center',marginBottom:'12px',color:'#e8732a'}}><Star size={30} strokeWidth={1.5}/></div>
                      <div style={{fontSize:'14px',fontWeight:'600',color:'#6e6e73',marginBottom:'6px'}}>None of your teams are showing today</div>
                      <div style={{fontSize:'12px'}}>Check back on match days</div>
                    </div>
                  ) : (
                    <>
                      <div style={{fontSize:'11px',fontWeight:'700',letterSpacing:'1.5px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'12px',paddingLeft:'4px'}}>Pubs showing your teams today</div>
                      {favouritePubs.map(pub => <PubCard key={pub.id} pub={pub} isSelected={mobilePubDetail?.id===pub.id} compact />)}
                    </>
                  )}
                </div>
              )}

              {/* FILTERS TAB */}
              {mobileTab === 'filters' && (
                <div style={{padding:'16px'}}>
                  <div style={{marginBottom:'20px'}}>
                    <div style={{fontSize:'9px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'10px'}}>1 · Sport</div>
                    {availableSports.length === 0
                      ? <div style={{fontSize:'12px',color:'#aeaeb2'}}>No sports available today</div>
                      : <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                          {availableSports.map(sport => {
                            const isActive = selectedSport === sport
                            return <button key={sport} onClick={() => { handleSelectSport(sport); setMobileTab('venues') }}
                              style={{padding:'10px 18px',borderRadius:'20px',border:`1px solid ${isActive?'#e8732a':'rgba(0,0,0,0.08)'}`,background:isActive?'#e8732a':'white',fontSize:'13px',fontWeight:'700',color:isActive?'white':'#6e6e73',cursor:'pointer'}}>{sport}</button>
                          })}
                        </div>
                    }
                  </div>
                  {selectedSport && (
                    <div style={{marginBottom:'20px'}}>
                      <div style={{fontSize:'9px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'10px'}}>2 · League</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                        {availableLeagues.map(league => {
                          const isActive = selectedLeague === league
                          return <button key={league} onClick={() => handleSelectLeague(league)}
                            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderRadius:'10px',border:`1px solid ${isActive?'#e8732a44':'rgba(0,0,0,0.08)'}`,background:isActive?'#e8732a12':'white',cursor:'pointer',textAlign:'left'}}>
                            <span style={{fontSize:'14px',fontWeight:'600',color:isActive?'#e8732a':'#6e6e73'}}>{league}</span>
                            {isActive && <Check size={13} strokeWidth={2.5} color="#e8732a"/>}
                          </button>
                        })}
                      </div>
                    </div>
                  )}
                  {selectedLeague && (
                    <div style={{marginBottom:'20px'}}>
                      <div style={{fontSize:'9px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'10px'}}>3 · Fixture</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                        {leagueFixtures.map(f => {
                          const isSelected = selectedFixtureIds.includes(f.id)
                          const time = new Date(f.kickoff_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
                          return <button key={f.id} onClick={() => toggleFixture(f.id)}
                            style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',borderRadius:'10px',border:`1px solid ${isSelected?'#e8732a44':'rgba(0,0,0,0.08)'}`,background:isSelected?'#e8732a12':'white',cursor:'pointer',textAlign:'left'}}>
                            <div style={{width:'20px',height:'20px',borderRadius:'5px',border:`1px solid ${isSelected?'#e8732a':'rgba(0,0,0,0.15)'}`,background:isSelected?'#e8732a':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              {isSelected && <Check size={13} strokeWidth={2.5} color="white"/>}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:'13px',fontWeight:'700',color:isSelected?'#1d1d1f':'#6e6e73',marginBottom:'2px'}}>{f.home_team} vs {f.away_team}</div>
                              <div style={{fontSize:'11px',color:'#aeaeb2'}}>{time} · {f.broadcaster}</div>
                            </div>
                          </button>
                        })}
                      </div>
                      {selectedFixtureIds.length > 0 && <button onClick={() => setSelectedFixtureIds([])} style={{width:'100%',marginTop:'10px',padding:'10px',borderRadius:'8px',border:'1px solid rgba(0,0,0,0.08)',background:'transparent',color:'#6e6e73',fontSize:'13px',cursor:'pointer'}}>Clear fixture selection</button>}
                    </div>
                  )}
                  {selectedSport && <button onClick={resetFilters} style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid rgba(0,0,0,0.08)',background:'transparent',color:'#aeaeb2',fontSize:'13px',cursor:'pointer'}}>Reset all filters</button>}
                  {(selectedSport || selectedLeague) && (
                    <button onClick={() => { setMobileTab('venues'); if (sheetState==='full') setSheetState('half') }}
                      style={{width:'100%',marginTop:'10px',padding:'14px',borderRadius:'10px',background:'#e8732a',color:'white',border:'none',fontSize:'15px',fontWeight:'700',cursor:'pointer',boxShadow:'0 4px 16px rgba(232,115,42,0.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                      View {activePubs.length} venue{activePubs.length!==1?'s':''} <ArrowRight size={16} strokeWidth={2.5}/>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fan panel mobile */}
        {fanSession && fanPanelOpen && (
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:500}}>
            <div onClick={() => setFanPanelOpen(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)'}}/>
            <div style={{position:'absolute',top:0,right:0,width:'290px',height:'100vh',background:'rgba(255,255,255,0.95)',backdropFilter:'saturate(200%) blur(24px)',WebkitBackdropFilter:'saturate(200%) blur(24px)',borderLeft:'1px solid rgba(0,0,0,0.06)',padding:'28px 20px',overflowY:'auto'}}>
              <button onClick={() => setFanPanelOpen(false)} style={{position:'absolute',top:'14px',right:'14px',background:'#f5f5f7',border:'none',borderRadius:'50%',width:'28px',height:'28px',color:'#8e8e93',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14} strokeWidth={2}/></button>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'24px',paddingTop:'8px'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'linear-gradient(135deg,#e8732a,#c45e1a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'800',color:'white',flexShrink:0,boxShadow:'0 4px 12px rgba(232,115,42,0.3)'}}>
                  {fanSession.user.email[0].toUpperCase()}
                </div>
                <div>
                  <div style={{fontWeight:'700',fontSize:'14px',color:'#1d1d1f'}}>Fan Account</div>
                  <div style={{fontSize:'11px',color:'#aeaeb2',marginTop:'2px',wordBreak:'break-all'}}>{fanSession.user.email}</div>
                </div>
              </div>
              {fanProfile?.favourite_teams?.length > 0 && (
                <div style={{marginBottom:'20px'}}>
                  <div style={{fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'8px',fontWeight:'700'}}>Favourite Teams</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'5px'}}>
                    {fanProfile.favourite_teams.map(t => <div key={t} style={{background:'#e8732a12',border:'1px solid #e8732a28',borderRadius:'14px',padding:'3px 10px',fontSize:'11px',color:'#e8732a',fontWeight:'600'}}>{t}</div>)}
                  </div>
                </div>
              )}
              <a href="/fan/profile" style={{display:'block',background:'#f5f5f7',border:'1px solid rgba(0,0,0,0.06)',color:'#1d1d1f',borderRadius:'8px',padding:'12px',fontSize:'14px',fontWeight:'600',textAlign:'center',marginBottom:'8px'}}>Edit Profile</a>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href='/' }} style={{width:'100%',background:'none',border:'1px solid rgba(0,0,0,0.08)',borderRadius:'8px',padding:'12px',fontSize:'14px',color:'#aeaeb2',cursor:'pointer'}}>Sign Out</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── DESKTOP ─────────────────────────────────────────────────────────────────
  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',background:'#f5f5f7'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}} .filter-pill:hover{background:rgba(0,0,0,0.04)!important;border-color:rgba(0,0,0,0.12)!important} .pub-hover:hover{border-color:rgba(0,0,0,0.12)!important;background:#fafafa!important}`}</style>

      {/* Top nav bar */}
      <div style={{background:'rgba(255,255,255,0.75)',borderBottom:'1px solid rgba(0,0,0,0.06)',padding:'0 24px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px',flexShrink:0,backdropFilter:'saturate(200%) blur(20px)',WebkitBackdropFilter:'saturate(200%) blur(20px)'}}>
        <a href="/"><img src="/SportSpot Logo Updated.png" alt="SportSpot" style={{height:'40px',width:'auto'}}/></a>

        {/* Filter bar — centre */}
        <div ref={filterRef} style={{position:'relative',flex:1,maxWidth:'680px'}}>
          <div style={{display:'flex',gap:'6px',alignItems:'center',justifyContent:'center',flexWrap:'nowrap',overflowX:'auto'}}>

            {/* Sport pills */}
            {availableSports.map(sport => {
              const isActive = selectedSport === sport
              return (
                <button key={sport} className="filter-pill" onClick={() => handleSelectSport(sport)}
                  style={{padding:'6px 14px',borderRadius:'20px',border:`1px solid ${isActive?'#e8732a55':'rgba(0,0,0,0.08)'}`,background:isActive?'#e8732a18':'white',fontSize:'12px',fontWeight:'700',color:isActive?'#e8732a':'#6e6e73',cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s',letterSpacing:'0.2px'}}>
                  {sport}
                </button>
              )
            })}

            {selectedSport && availableLeagues.length > 0 && (
              <>
                <ChevronRight size={14} strokeWidth={2} color="#c7c7cc"/>
                {availableLeagues.map(league => {
                  const isActive = selectedLeague === league
                  return (
                    <button key={league} className="filter-pill" onClick={() => handleSelectLeague(league)}
                      style={{padding:'6px 14px',borderRadius:'20px',border:`1px solid ${isActive?'#e8732a55':'rgba(0,0,0,0.08)'}`,background:isActive?'#e8732a18':'white',fontSize:'12px',fontWeight:'600',color:isActive?'#e8732a':'#6e6e73',cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s'}}>
                      {league}
                    </button>
                  )
                })}
              </>
            )}

            {selectedLeague && leagueFixtures.length > 0 && (
              <>
                <ChevronRight size={14} strokeWidth={2} color="#c7c7cc"/>
                {leagueFixtures.map(f => {
                  const isSelected = selectedFixtureIds.includes(f.id)
                  const time = new Date(f.kickoff_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})
                  return (
                    <button key={f.id} className="filter-pill" onClick={() => toggleFixture(f.id)}
                      style={{padding:'6px 14px',borderRadius:'20px',border:`1px solid ${isSelected?'#e8732a55':'rgba(0,0,0,0.08)'}`,background:isSelected?'#e8732a18':'white',fontSize:'11px',fontWeight:'600',color:isSelected?'#e8732a':'#6e6e73',cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s',display:'flex',alignItems:'center',gap:'6px'}}>
                      <span>{f.home_team} vs {f.away_team}</span>
                      <span style={{color:isSelected?'#e8732a88':'#c7c7cc',fontSize:'12px'}}>· {time}</span>
                    </button>
                  )
                })}
              </>
            )}

            {activeFiltersCount > 0 && (
              <button onClick={resetFilters}
                style={{padding:'6px 12px',borderRadius:'20px',border:'1px solid #dc262633',background:'#dc262610',fontSize:'11px',fontWeight:'700',color:'#dc2626',cursor:'pointer',whiteSpace:'nowrap',letterSpacing:'0.2px',display:'flex',alignItems:'center',gap:'4px'}}>
                Clear <X size={11} strokeWidth={2.5}/>
              </button>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
          <div style={{fontSize:'12px',color:'#aeaeb2',fontWeight:'600',whiteSpace:'nowrap'}}>{activePubs.length} venue{activePubs.length!==1?'s':''}</div>
          <a href="/login" style={{background:'transparent',color:'#6e6e73',padding:'6px 12px',borderRadius:'8px',fontSize:'12px',fontWeight:'600',border:'1px solid rgba(0,0,0,0.08)',whiteSpace:'nowrap'}}>Venue Login</a>
          {fanSession ? (
            <button onClick={() => setFanPanelOpen(p => !p)}
              style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#e8732a,#c45e1a)',border:'none',color:'white',fontWeight:'800',fontSize:'13px',cursor:'pointer',flexShrink:0,boxShadow:'0 2px 8px rgba(232,115,42,0.25)'}}>
              {fanSession.user.email[0].toUpperCase()}
            </button>
          ) : (
            <a href="/fan/register" style={{background:'#e8732a',color:'white',padding:'6px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap'}}>Sign Up</a>
          )}
        </div>
      </div>

      <div style={{flex:'1',display:'flex',overflow:'hidden'}}>

        {/* Left panel */}
        <div style={{width:'320px',minWidth:'320px',background:'rgba(255,255,255,0.6)',borderRight:'1px solid rgba(0,0,0,0.06)',overflowY:'auto',display:'flex',flexDirection:'column',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)'}}>

          {/* Panel tabs */}
          <div style={{display:'flex',borderBottom:'1px solid rgba(0,0,0,0.06)',background:'rgba(255,255,255,0.7)',flexShrink:0}}>
            {[
              {id:'all', label:`All Venues`, count: activePubs.length},
              {id:'favourites', label:'Venues Showing Your Teams', count: favouritePubs.length},
            ].map(tab => (
              <button key={tab.id} onClick={() => setDesktopListTab(tab.id)}
                style={{flex:1,padding:'14px 8px',fontSize:'12px',fontWeight:'700',border:'none',cursor:'pointer',background:'transparent',
                  color: desktopListTab===tab.id?'#e8732a':'#aeaeb2',
                  borderBottom: desktopListTab===tab.id?'2px solid #e8732a':'2px solid transparent',
                  letterSpacing:'0.2px',transition:'all 0.15s'}}>
                {tab.label}
                {tab.count > 0 && <span style={{marginLeft:'6px',fontSize:'10px',background:desktopListTab===tab.id?'#e8732a22':'rgba(0,0,0,0.05)',color:desktopListTab===tab.id?'#e8732a':'#aeaeb2',padding:'1px 6px',borderRadius:'10px',fontWeight:'700'}}>{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Sub header */}
          <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(0,0,0,0.06)',background:'rgba(255,255,255,0.4)',flexShrink:0}}>
            <div style={{fontSize:'11px',color:'#aeaeb2',fontWeight:'500'}}>
              {desktopListTab === 'favourites'
                ? fanProfile?.favourite_teams?.length
                  ? `Pubs showing your teams${userLocation?' · nearest first':''}`
                  : 'Set favourite teams in your profile'
                : selectedFixtureIds.length > 0 ? `${selectedFixtureIds.length} fixture${selectedFixtureIds.length>1?'s':''} selected`
                  : selectedLeague ? selectedLeague
                  : selectedSport ? selectedSport
                  : `All sports${userLocation?' · nearest first':''}`
              }
            </div>
          </div>

          {/* Pub list */}
          <div style={{padding:'10px',flex:1,overflowY:'auto'}}>
            {desktopListTab === 'favourites' && !fanProfile?.favourite_teams?.length ? (
              <div style={{textAlign:'center',padding:'48px 16px'}}>
                <div style={{display:'flex',justifyContent:'center',marginBottom:'12px',color:'#e8732a'}}><Star size={26} strokeWidth={1.5}/></div>
                <div style={{fontSize:'13px',fontWeight:'600',color:'#6e6e73',marginBottom:'12px'}}>No favourite teams set</div>
                <a href="/fan/profile" style={{display:'inline-block',background:'#e8732a',color:'white',borderRadius:'8px',padding:'9px 18px',fontSize:'12px',fontWeight:'700'}}>Set Favourite Teams</a>
              </div>
            ) : desktopListTab === 'favourites' && favouritePubs.length === 0 ? (
              <div style={{textAlign:'center',padding:'48px 16px',color:'#aeaeb2'}}>
                <div style={{display:'flex',justifyContent:'center',marginBottom:'12px',color:'#e8732a'}}><Star size={26} strokeWidth={1.5}/></div>
                <div style={{fontSize:'13px',fontWeight:'600',color:'#6e6e73',marginBottom:'6px'}}>None of your teams showing today</div>
                <div style={{fontSize:'11px'}}>Check back on match days</div>
              </div>
            ) : displayedPubs.length === 0 ? (
              <div style={{textAlign:'center',padding:'48px 16px',color:'#aeaeb2'}}>
                <div style={{display:'flex',justifyContent:'center',marginBottom:'12px'}}><Tv size={26} strokeWidth={1.5}/></div>
                <div style={{fontSize:'13px',fontWeight:'600',color:'#6e6e73',marginBottom:'6px'}}>{selectedSport?'No venues meet filter requirements':'No venues confirmed yet'}</div>
                <div style={{fontSize:'11px'}}>{selectedSport?'No pubs showing this today.':'Check back closer to kick-off.'}</div>
              </div>
            ) : displayedPubs.map(pub => (
              <PubCard key={pub.id} pub={pub} isSelected={selectedPub?.id===pub.id} />
            ))}
          </div>
        </div>

        {/* Map */}
        <div style={{flex:'1',position:'relative'}}>
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}>
            <Map defaultCenter={mapCenter} defaultZoom={13} mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY} style={{width:'100%',height:'100%'}} colorScheme="LIGHT">
              {activePubs.map(pub => (
                <AdvancedMarker key={pub.id} position={{lat:pub.latitude,lng:pub.longitude}} onClick={() => selectPub(pub)}>
                  <Pin
                    background={selectedPub?.id===pub.id?'#e8732a':isFavouritePub(pub)?'#22c55e':'white'}
                    borderColor={selectedPub?.id===pub.id?'#e8732a':isFavouritePub(pub)?'#16a34a':'#e8732a'}
                    glyphColor="white"
                    glyphSrc={isFavouritePub(pub)?PIN_STAR_GLYPH:PIN_TV_GLYPH}
                  />
                </AdvancedMarker>
              ))}
              {selectedPub && (
                <InfoWindow position={{lat:selectedPub.latitude,lng:selectedPub.longitude}} onCloseClick={() => setSelectedPub(null)}>
                  <PubInfoWindow pub={selectedPub}/>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </div>
      </div>

      {/* Fan slide-out panel — desktop */}
      {fanSession && (
        <div style={{position:'fixed',top:0,right:fanPanelOpen?0:'-340px',width:'320px',height:'100vh',background:'rgba(255,255,255,0.95)',backdropFilter:'saturate(200%) blur(24px)',WebkitBackdropFilter:'saturate(200%) blur(24px)',borderLeft:'1px solid rgba(0,0,0,0.06)',zIndex:1000,transition:'right 0.3s cubic-bezier(0.4,0,0.2,1)',padding:'32px 24px',overflowY:'auto',boxShadow:'-8px 0 40px rgba(0,0,0,0.08)'}}>
          <button onClick={() => setFanPanelOpen(false)} style={{position:'absolute',top:'16px',right:'16px',background:'#f5f5f7',border:'none',borderRadius:'50%',width:'28px',height:'28px',color:'#8e8e93',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={14} strokeWidth={2}/></button>
          <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'28px',paddingTop:'8px'}}>
            <div style={{width:'48px',height:'48px',borderRadius:'50%',background:'linear-gradient(135deg,#e8732a,#c45e1a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:'800',color:'white',flexShrink:0,boxShadow:'0 4px 16px rgba(232,115,42,0.3)'}}>
              {fanSession.user.email[0].toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight:'700',fontSize:'14px',color:'#1d1d1f',letterSpacing:'-0.1px'}}>Fan Account</div>
              <div style={{fontSize:'11px',color:'#aeaeb2',marginTop:'2px'}}>{fanSession.user.email}</div>
            </div>
          </div>
          {fanProfile?.favourite_teams?.length > 0 && (
            <div style={{marginBottom:'24px'}}>
              <div style={{fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'10px',fontWeight:'700'}}>Favourite Teams</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {fanProfile.favourite_teams.map(t => <div key={t} style={{background:'#e8732a12',border:'1px solid #e8732a28',borderRadius:'16px',padding:'4px 12px',fontSize:'12px',color:'#e8732a',fontWeight:'600'}}>{t}</div>)}
              </div>
            </div>
          )}
          {fanProfile?.favourite_sports?.length > 0 && (
            <div style={{marginBottom:'28px'}}>
              <div style={{fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',color:'#aeaeb2',marginBottom:'10px',fontWeight:'700'}}>Favourite Sports</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {fanProfile.favourite_sports.map(s => <div key={s} style={{background:'#f5f5f7',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'4px 12px',fontSize:'12px',color:'#6e6e73',fontWeight:'600'}}>{s}</div>)}
              </div>
            </div>
          )}
          <a href="/fan/profile" style={{display:'block',background:'#f5f5f7',border:'1px solid rgba(0,0,0,0.06)',color:'#1d1d1f',borderRadius:'10px',padding:'12px',fontSize:'14px',fontWeight:'600',textAlign:'center',marginBottom:'8px'}}>Edit Profile</a>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href='/' }} style={{width:'100%',background:'none',border:'1px solid rgba(0,0,0,0.08)',borderRadius:'10px',padding:'12px',fontSize:'14px',color:'#aeaeb2',cursor:'pointer'}}>Sign Out</button>
        </div>
      )}
    </div>
  )
}
