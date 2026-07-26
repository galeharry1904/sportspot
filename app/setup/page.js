'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function SetupPage() {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [hasSky, setHasSky] = useState(false)
  const [hasTnt, setHasTnt] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSetup() {
    setLoading(true)
    setError(null)

    const { data, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !data.session) {
      setError('Session expired. Please sign in again.')
      setLoading(false)
      router.push('/login')
      return
    }

    const userId = data.session.user.id

    const { error } = await supabase.from('pubs').insert({
      name,
      address,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      has_sky: hasSky,
      has_tnt: hasTnt,
      owner_id: userId
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '10px',
    padding: '13px 14px',
    color: '#152238',
    marginBottom: '12px',
    fontSize: '15px',
    outline: 'none',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden',background:'linear-gradient(135deg, #fff8f3 0%, #ffffff 25%, #f0f4ff 55%, #f8f0ff 80%, #fff5f0 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif"}}>
      <style>{`
        * { box-sizing: border-box; }
        .auth-input:focus { border-color: #e8732a !important; box-shadow: 0 0 0 3px rgba(232,115,42,0.12); }
        .auth-submit { transition: all 0.25s cubic-bezier(0.22,1,0.36,1); }
        .auth-submit:hover:not(:disabled) { transform: scale(1.015); box-shadow: 0 8px 28px rgba(232,115,42,0.35) !important; }
        .setup-check { accent-color: #e8732a; width: 16px; height: 16px; }
      `}</style>

      <div style={{position:'absolute',top:'-10%',left:'-8%',width:'50vw',height:'50vw',borderRadius:'50%',background:'rgba(232,115,42,0.16)',filter:'blur(90px)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:'-15%',right:'-10%',width:'50vw',height:'50vw',borderRadius:'50%',background:'rgba(99,102,241,0.14)',filter:'blur(100px)',pointerEvents:'none'}}/>

      <div style={{
        background:'rgba(255,255,255,0.55)',
        backdropFilter:'saturate(200%) blur(32px)',
        WebkitBackdropFilter:'saturate(200%) blur(32px)',
        border:'1px solid rgba(255,255,255,0.7)',
        boxShadow:'0 8px 64px rgba(0,0,0,0.08), 0 2px 0 rgba(255,255,255,0.8) inset',
        borderRadius:'28px',
        padding:'44px 40px',
        width:'100%',
        maxWidth:'480px',
        position:'relative',
        zIndex:1,
      }}>
        <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(232,115,42,0.1)',border:'1px solid rgba(232,115,42,0.25)',borderRadius:'980px',padding:'5px 14px',marginBottom:'16px'}}>
          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#e8732a'}}/>
          <span style={{fontSize:'12px',color:'#e8732a',fontWeight:'600',letterSpacing:'0.2px'}}>Venue setup</span>
        </div>
        <h1 style={{color:'#152238',fontSize:'28px',fontWeight:'700',letterSpacing:'-1px',marginBottom:'4px'}}>Set up your venue</h1>
        <p style={{color:'#6e6e73',marginBottom:'28px',fontSize:'14px'}}>This information appears on the fan map</p>
        <input className="auth-input" style={inputStyle} placeholder="Pub name" value={name} onChange={e=>setName(e.target.value)}/>
        <input className="auth-input" style={inputStyle} placeholder="Full address" value={address} onChange={e=>setAddress(e.target.value)}/>
        <p style={{color:'#aeaeb2',fontSize:'12px',marginBottom:'8px'}}>Find coordinates at maps.google.com — right-click your pub and copy the numbers</p>
        <input className="auth-input" style={inputStyle} placeholder="Latitude (e.g. 51.5045)" value={lat} onChange={e=>setLat(e.target.value)}/>
        <input className="auth-input" style={inputStyle} placeholder="Longitude (e.g. -0.0865)" value={lng} onChange={e=>setLng(e.target.value)}/>
        <p style={{color:'#152238',fontSize:'14px',marginBottom:'12px',fontWeight:'600'}}>Sports packages</p>
        <label style={{display:'flex',alignItems:'center',gap:'10px',color:'#3a3a3c',marginBottom:'10px',cursor:'pointer',fontSize:'14px'}}>
          <input className="setup-check" type="checkbox" checked={hasSky} onChange={e=>setHasSky(e.target.checked)}/> Sky Sports
        </label>
        <label style={{display:'flex',alignItems:'center',gap:'10px',color:'#3a3a3c',marginBottom:'24px',cursor:'pointer',fontSize:'14px'}}>
          <input className="setup-check" type="checkbox" checked={hasTnt} onChange={e=>setHasTnt(e.target.checked)}/> TNT Sports
        </label>
        {error && (
          <p style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',padding:'10px 12px',color:'#dc2626',fontSize:'13px',marginBottom:'12px'}}>{error}</p>
        )}
        <button className="auth-submit" onClick={handleSetup} disabled={loading}
          style={{width:'100%',background:'#e8732a',color:'white',border:'none',borderRadius:'980px',padding:'15px',fontSize:'16px',fontWeight:'600',letterSpacing:'-0.2px',cursor:'pointer',boxShadow:'0 4px 20px rgba(232,115,42,0.3)'}}>
          {loading ? 'Saving...' : 'Save & Go to Dashboard'}
        </button>
      </div>
    </div>
  )
}
