'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { supabase } from '../../lib/supabase'
import { Clock, MapPin, X, Navigation } from '../../lib/icons'

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2-lat1) * Math.PI / 180
  const dLon = (lon2-lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2)
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 0.621371).toFixed(1)
}

function formatKickoff(kickoffTime) {
  return new Date(kickoffTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatStopTime(stopTime) {
  const [h, m] = stopTime.split(':')
  const d = new Date()
  d.setHours(Number(h), Number(m))
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// Prefer a neighbourhood-level name ("Greenwich") over a full street
// address — matches the short, area-style labels the input placeholder
// suggests and what a stop list is actually useful to scan.
function areaLabelFromGeocodeResult(result) {
  const components = result.address_components || []
  const priorityTypes = ['neighborhood', 'sublocality_level_1', 'sublocality', 'postal_town', 'locality']
  for (const type of priorityTypes) {
    const match = components.find(c => c.types.includes(type))
    if (match) return match.long_name
  }
  return result.formatted_address
}

const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 }

export default function PlanPage() {
  const [fanSession, setFanSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stops, setStops] = useState([])
  const [pendingPin, setPendingPin] = useState(null)
  const [newLabel, setNewLabel] = useState('')
  const [newTime, setNewTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [fixtures, setFixtures] = useState([])
  const [selectedFixtureId, setSelectedFixtureId] = useState('')
  const [suggestions, setSuggestions] = useState(null)
  const [finding, setFinding] = useState(false)
  const [findError, setFindError] = useState(null)
  const router = useRouter()

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/fan/login'); return }
    setFanSession(session)
    await Promise.all([loadStops(session.user.id), loadFixtures()])
    setLoading(false)
  }

  async function loadStops(userId) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('itinerary_stops').select('*')
      .eq('user_id', userId).eq('plan_date', today).order('stop_time')
    setStops(data || [])
  }

  async function loadFixtures() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('fixtures').select('*')
      .eq('fixture_date', today).order('kickoff_time')
    setFixtures(data || [])
  }

  async function addStop() {
    if (!pendingPin || !newLabel.trim() || !newTime) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('itinerary_stops').insert({
      user_id: fanSession.user.id,
      plan_date: today,
      label: newLabel.trim(),
      latitude: pendingPin.lat,
      longitude: pendingPin.lng,
      stop_time: newTime,
    })
    setPendingPin(null)
    setNewLabel('')
    setNewTime('')
    await loadStops(fanSession.user.id)
    setSaving(false)
  }

  async function removeStop(id) {
    setStops(s => s.filter(x => x.id !== id))
    await supabase.from('itinerary_stops').delete().eq('id', id)
  }

  async function findPubs() {
    if (!selectedFixtureId || stops.length === 0) return
    setFinding(true)
    setFindError(null)
    setSuggestions(null)

    const fixture = fixtures.find(f => String(f.id) === String(selectedFixtureId))
    const kickoff = new Date(fixture.kickoff_time)
    const kickoffMinutes = kickoff.getHours() * 60 + kickoff.getMinutes()

    let nearestStop = stops[0]
    let bestDiff = Infinity
    for (const s of stops) {
      const [h, m] = s.stop_time.split(':').map(Number)
      const diff = Math.abs((h * 60 + m) - kickoffMinutes)
      if (diff < bestDiff) { bestDiff = diff; nearestStop = s }
    }

    const { data: showingRows, error } = await supabase.from('showings')
      .select('*, pubs(*)').eq('fixture_id', fixture.id).eq('is_showing', true)

    if (error) {
      setFindError(error.message)
      setFinding(false)
      return
    }

    const ranked = (showingRows || [])
      .filter(s => s.pubs)
      .map(s => ({ ...s.pubs, distance: parseFloat(getDistance(nearestStop.latitude, nearestStop.longitude, s.pubs.latitude, s.pubs.longitude)) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)

    setSuggestions({ nearestStop, fixture, ranked })
    setFinding(false)
  }

  const inputStyle = { width:'100%', padding:'10px 12px', background:'white', border:'1px solid rgba(0,0,0,0.1)', borderRadius:'8px', color:'#152238', fontSize:'14px', outline:'none' }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#6e6e73',background:'#f5f5f7'}}>Loading...</div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f7',fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif"}}>
      <style>{`
        * { box-sizing: border-box; }
        @media (hover: hover) and (pointer: fine) {
          .nav-link:hover { background: rgba(0,0,0,0.04) !important; }
          .find-btn:hover:not(:disabled) { transform: scale(1.01); }
        }
      `}</style>

      {/* Nav */}
      <nav style={{background:'rgba(245,245,247,0.72)',borderBottom:'1px solid rgba(0,0,0,0.08)',padding:'0 32px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,backdropFilter:'saturate(200%) blur(28px)',WebkitBackdropFilter:'saturate(200%) blur(28px)'}}>
        <a href="/"><img src="/SportSpot-Logo-Light.png" alt="SportSpot" style={{height:'48px',width:'auto'}}/></a>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <a href="/" className="nav-link" style={{color:'#3a3a3c',fontSize:'13px',padding:'7px 14px',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'8px',fontWeight:'500'}}>Return to Home Page</a>
          <a href="/map" className="nav-link" style={{color:'#3a3a3c',fontSize:'13px',padding:'7px 14px',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'8px',fontWeight:'500'}}>Fan Map</a>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href='/' }} className="nav-link"
            style={{color:'#3a3a3c',fontSize:'13px',background:'none',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'8px',padding:'7px 14px',cursor:'pointer',fontWeight:'500'}}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{maxWidth:'720px',margin:'0 auto',padding:'32px 24px'}}>
        <h1 style={{fontSize:'24px',fontWeight:'700',color:'#152238',letterSpacing:'-0.5px',marginBottom:'4px'}}>Plan your day</h1>
        <p style={{color:'#6e6e73',fontSize:'14px',marginBottom:'28px'}}>Tell us where you'll be — let us find you a pub.</p>

        {/* Today's stops */}
        <div style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'24px',marginBottom:'20px',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
          <h2 style={{fontSize:'15px',fontWeight:'700',color:'#152238',marginBottom:'14px'}}>Today's stops</h2>

          {stops.length === 0 ? (
            <p style={{color:'#aeaeb2',fontSize:'13px',marginBottom:'16px'}}>No stops added yet — drop a pin below for your first one.</p>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'16px'}}>
              {stops.map(stop => (
                <div key={stop.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f5f5f7',borderRadius:'10px',padding:'10px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <Clock size={14} color="#e8732a"/>
                    <span style={{fontSize:'13px',fontWeight:'700',color:'#152238'}}>{formatStopTime(stop.stop_time)}</span>
                    <span style={{fontSize:'13px',color:'#6e6e73'}}>{stop.label}</span>
                  </div>
                  <button onClick={() => removeStop(stop.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#aeaeb2',padding:'4px'}}>
                    <X size={14}/>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{borderTop:'1px solid rgba(0,0,0,0.06)',paddingTop:'16px'}}>
            <p style={{fontSize:'12px',color:'#6e6e73',marginBottom:'8px',fontWeight:'600'}}>Add a stop — tap the map to drop a pin</p>
            <div style={{height:'220px',borderRadius:'10px',overflow:'hidden',marginBottom:'10px',border:'1px solid rgba(0,0,0,0.06)'}}>
              <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}>
                <Map defaultCenter={LONDON_CENTER} defaultZoom={11} mapId="DEMO_MAP_ID"
                  style={{width:'100%',height:'100%'}} colorScheme="LIGHT" gestureHandling="greedy"
                  onClick={e => {
                    if (!e.detail.latLng) return
                    const pin = { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng }
                    setPendingPin(pin)
                    if (window.google?.maps) {
                      new window.google.maps.Geocoder().geocode({ location: pin }, (results, status) => {
                        if (status === 'OK' && results?.[0]) setNewLabel(areaLabelFromGeocodeResult(results[0]))
                      })
                    }
                  }}>
                  {pendingPin && (
                    <AdvancedMarker position={pendingPin}>
                      <MapPin size={28} color="#e8732a" fill="#e8732a"/>
                    </AdvancedMarker>
                  )}
                </Map>
              </APIProvider>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <input style={{...inputStyle, flex:1}} placeholder="Label (e.g. Greenwich)" value={newLabel} onChange={e => setNewLabel(e.target.value)}/>
              <input style={{...inputStyle, width:'110px'}} type="time" value={newTime} onChange={e => setNewTime(e.target.value)}/>
              <button onClick={addStop} disabled={!pendingPin || !newLabel.trim() || !newTime || saving}
                style={{background:'#e8732a',color:'white',border:'none',borderRadius:'8px',padding:'0 18px',fontSize:'13px',fontWeight:'700',cursor:'pointer',opacity:(!pendingPin || !newLabel.trim() || !newTime || saving) ? 0.5 : 1,whiteSpace:'nowrap'}}>
                {saving ? 'Adding...' : 'Add Stop'}
              </button>
            </div>
            {!pendingPin ? (
              <p style={{fontSize:'11px',color:'#aeaeb2',marginTop:'6px'}}>Tap the map above to drop a pin first.</p>
            ) : !newLabel.trim() ? (
              <p style={{fontSize:'11px',color:'#aeaeb2',marginTop:'6px'}}>Give this stop a label to add it.</p>
            ) : !newTime ? (
              <p style={{fontSize:'11px',color:'#aeaeb2',marginTop:'6px'}}>Pick a time for this stop to add it.</p>
            ) : null}
          </div>
        </div>

        {/* Find pubs */}
        <div style={{background:'white',border:'1px solid rgba(0,0,0,0.06)',borderRadius:'16px',padding:'24px',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
          <h2 style={{fontSize:'15px',fontWeight:'700',color:'#152238',marginBottom:'14px'}}>Find a pub for a game</h2>

          {fixtures.length === 0 ? (
            <p style={{color:'#aeaeb2',fontSize:'13px'}}>No fixtures today.</p>
          ) : (
            <>
              <select value={selectedFixtureId} onChange={e => setSelectedFixtureId(e.target.value)} style={{...inputStyle, marginBottom:'12px'}}>
                <option value="">Select a fixture...</option>
                {fixtures.map(f => (
                  <option key={f.id} value={f.id}>{formatKickoff(f.kickoff_time)} — {f.home_team} vs {f.away_team} ({f.competition})</option>
                ))}
              </select>
              <button className="find-btn" onClick={findPubs} disabled={!selectedFixtureId || stops.length === 0 || finding}
                style={{width:'100%',background:'#e8732a',color:'white',border:'none',borderRadius:'980px',padding:'13px',fontSize:'14px',fontWeight:'700',cursor:'pointer',opacity:(!selectedFixtureId || stops.length === 0 || finding) ? 0.5 : 1,transition:'transform 0.15s ease'}}>
                {finding ? 'Finding pubs...' : 'Find Pubs'}
              </button>
              {stops.length === 0 && <p style={{fontSize:'11px',color:'#aeaeb2',marginTop:'8px',textAlign:'center'}}>Add at least one stop above first.</p>}
            </>
          )}

          {findError && (
            <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',padding:'10px 14px',color:'#dc2626',fontSize:'13px',marginTop:'14px'}}>{findError}</div>
          )}

          {suggestions && (
            <div style={{marginTop:'20px',borderTop:'1px solid rgba(0,0,0,0.06)',paddingTop:'20px'}}>
              <p style={{fontSize:'13px',color:'#6e6e73',marginBottom:'14px'}}>
                For <strong style={{color:'#152238'}}>{suggestions.fixture.home_team} vs {suggestions.fixture.away_team}</strong> at {formatKickoff(suggestions.fixture.kickoff_time)},
                closest to where you'll be (<strong style={{color:'#152238'}}>{suggestions.nearestStop.label}</strong> at {formatStopTime(suggestions.nearestStop.stop_time)}):
              </p>

              {suggestions.ranked.length === 0 ? (
                <div style={{background:'#f5f5f7',borderRadius:'12px',padding:'24px',textAlign:'center',color:'#aeaeb2',fontSize:'13px'}}>
                  No pubs are showing this fixture yet.
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  {suggestions.ranked.map(pub => (
                    <div key={pub.id} style={{background:'#f5f5f7',borderRadius:'12px',padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:'14px',fontWeight:'700',color:'#152238'}}>{pub.name}</div>
                        <div style={{fontSize:'12px',color:'#6e6e73',marginTop:'2px'}}>{pub.address}</div>
                        <div style={{display:'flex',gap:'6px',marginTop:'6px'}}>
                          {pub.has_sky && <span style={{fontSize:'9px',fontWeight:'800',background:'#0ea5e912',color:'#0ea5e9',border:'1px solid #0ea5e930',borderRadius:'5px',padding:'2px 6px',letterSpacing:'0.3px'}}>SKY</span>}
                          {pub.has_tnt && <span style={{fontSize:'9px',fontWeight:'800',background:'#a855f712',color:'#a855f7',border:'1px solid #a855f730',borderRadius:'5px',padding:'2px 6px',letterSpacing:'0.3px'}}>TNT</span>}
                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'6px'}}>
                        <div style={{fontSize:'13px',fontWeight:'700',color:'#e8732a',whiteSpace:'nowrap'}}>{pub.distance} mi</div>
                        <a href={`/map?pub=${pub.id}`} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',fontWeight:'700',color:'#e8732a',border:'1px solid rgba(232,115,42,0.3)',borderRadius:'8px',padding:'5px 9px',textDecoration:'none',whiteSpace:'nowrap'}}>
                          <MapPin size={11}/> View on map
                        </a>
                        <a href={`https://www.google.com/maps/dir/?api=1&origin=${suggestions.nearestStop.latitude},${suggestions.nearestStop.longitude}&destination=${pub.latitude},${pub.longitude}`} target="_blank" rel="noopener noreferrer"
                          style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',fontWeight:'700',color:'white',background:'#e8732a',borderRadius:'8px',padding:'5px 9px',textDecoration:'none',whiteSpace:'nowrap'}}>
                          <Navigation size={11}/> Google Maps
                        </a>
                        <a href={`https://citymapper.com/directions?startcoord=${suggestions.nearestStop.latitude},${suggestions.nearestStop.longitude}&endcoord=${pub.latitude},${pub.longitude}&endname=${encodeURIComponent(pub.name)}`} target="_blank" rel="noopener noreferrer"
                          style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',fontWeight:'700',color:'#152238',border:'1px solid rgba(0,0,0,0.15)',borderRadius:'8px',padding:'5px 9px',textDecoration:'none',whiteSpace:'nowrap'}}>
                          <Navigation size={11}/> Citymapper
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
