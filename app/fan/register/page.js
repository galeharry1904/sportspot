'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function FanRegister() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRegister() {
    setLoading(true); setError('')
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    await supabase.from('fan_profiles').insert({
      user_id: data.user.id,
      favourite_teams: [],
      favourite_sports: [],
      saved_pub_ids: [],
      notify_email: true
    })
    router.push('/fan/profile')
  }

  const inputStyle = {
    width:'100%', padding:'14px 16px', background:'rgba(255,255,255,0.6)',
    border:'1px solid rgba(0,0,0,0.1)', borderRadius:'10px', color:'#152238',
    fontSize:'16px', marginBottom:'12px', outline:'none',
    backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
    WebkitAppearance:'none', transition:'border-color 0.2s, box-shadow 0.2s'
  }

  return (
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',background:'linear-gradient(135deg, #fff8f3 0%, #ffffff 25%, #f0f4ff 55%, #f8f0ff 80%, #fff5f0 100%)',fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif"}}>
      <style>{`
        * { box-sizing: border-box; }
        .auth-input:focus { border-color: #e8732a !important; box-shadow: 0 0 0 3px rgba(232,115,42,0.12); }
        .auth-submit { transition: all 0.25s cubic-bezier(0.22,1,0.36,1); }
        @media (hover: hover) and (pointer: fine) {
          .auth-submit:hover:not(:disabled) { transform: scale(1.015); box-shadow: 0 8px 28px rgba(232,115,42,0.35) !important; }
          .auth-link:hover { text-decoration: underline; }
        }
        @media (max-width: 768px) {
          .auth-card { border-radius: 24px !important; padding: 32px 24px !important; }
          .auth-wrap { align-items: flex-start !important; padding: 24px 20px !important; }
        }
      `}</style>

      <div style={{position:'absolute',top:'-10%',right:'-10%',width:'50vw',height:'50vw',borderRadius:'50%',background:'rgba(168,85,247,0.14)',filter:'blur(100px)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:'-15%',left:'-10%',width:'50vw',height:'50vw',borderRadius:'50%',background:'rgba(232,115,42,0.16)',filter:'blur(90px)',pointerEvents:'none'}}/>

      {/* Nav */}
      <nav style={{padding:'0 24px',height:'60px',display:'flex',alignItems:'center',borderBottom:'1px solid rgba(0,0,0,0.08)',background:'rgba(255,255,255,0.5)',backdropFilter:'saturate(200%) blur(28px)',WebkitBackdropFilter:'saturate(200%) blur(28px)',flexShrink:0,position:'relative',zIndex:1}}>
        <a href="/"><img src="/SportSpot-Logo-Light.png" alt="SportSpot" style={{height:'48px',width:'auto'}}/></a>
      </nav>

      {/* Card */}
      <div className="auth-wrap" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',position:'relative',zIndex:1}}>
        <div className="auth-card" style={{
          width:'100%',maxWidth:'420px',
          background:'rgba(255,255,255,0.55)',
          backdropFilter:'saturate(200%) blur(32px)',
          WebkitBackdropFilter:'saturate(200%) blur(32px)',
          border:'1px solid rgba(255,255,255,0.7)',
          boxShadow:'0 8px 64px rgba(0,0,0,0.08), 0 2px 0 rgba(255,255,255,0.8) inset',
          borderRadius:'28px',padding:'40px',
        }}>
          <h1 style={{fontSize:'22px',fontWeight:'700',marginBottom:'4px',color:'#152238',letterSpacing:'-0.5px'}}>Create fan account</h1>
          <p style={{color:'#6e6e73',fontSize:'14px',marginBottom:'28px',lineHeight:'1.5'}}>
            Save your favourite teams and get notified when they are showing nearby.
          </p>

          {error && (
            <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',padding:'10px 14px',color:'#dc2626',fontSize:'13px',marginBottom:'16px'}}>
              {error}
            </div>
          )}

          <input className="auth-input" type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} style={inputStyle}/>
          <input className="auth-input" type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} style={inputStyle}/>

          <button className="auth-submit" onClick={handleRegister} disabled={loading}
            style={{width:'100%',background:'#e8732a',color:'white',border:'none',borderRadius:'980px',padding:'16px',fontSize:'16px',fontWeight:'600',letterSpacing:'-0.2px',marginTop:'4px',marginBottom:'16px',cursor:'pointer',boxShadow:'0 4px 20px rgba(232,115,42,0.3)',opacity: loading ? 0.7 : 1}}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p style={{textAlign:'center',fontSize:'13px',color:'#6e6e73'}}>
            Already have an account? <a href="/fan/login" className="auth-link" style={{color:'#e8732a',fontWeight:'600'}}>Sign in</a>
          </p>
          <div style={{borderTop:'1px solid rgba(0,0,0,0.08)',marginTop:'20px',paddingTop:'16px',textAlign:'center',display:'flex',flexDirection:'column',gap:'10px'}}>
            <a href="/login" className="auth-link" style={{color:'#aeaeb2',fontSize:'12px'}}>Pub manager? Sign in here →</a>
            <a href="/" className="auth-link" style={{color:'#aeaeb2',fontSize:'12px'}}>← Return to Home Page</a>
          </div>
        </div>
      </div>
    </div>
  )
}
