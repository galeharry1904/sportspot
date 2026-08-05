'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  async function handleLogin() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }
  const inputStyle = {width:'100%',background:'rgba(255,255,255,0.6)',border:'1px solid rgba(0,0,0,0.1)',borderRadius:'10px',padding:'13px 14px',color:'#152238',marginBottom:'12px',fontSize:'15px',outline:'none',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',transition:'border-color 0.2s, box-shadow 0.2s'}
  return (
    <div style={{minHeight:'100vh',position:'relative',overflow:'hidden',background:'linear-gradient(135deg, #fff8f3 0%, #ffffff 25%, #f0f4ff 55%, #f8f0ff 80%, #fff5f0 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif"}}>
      <style>{`
        * { box-sizing: border-box; }
        .auth-input:focus { border-color: #e8732a !important; box-shadow: 0 0 0 3px rgba(232,115,42,0.12); }
        .auth-submit { transition: all 0.25s cubic-bezier(0.22,1,0.36,1); }
        @media (hover: hover) and (pointer: fine) {
          .auth-submit:hover:not(:disabled) { transform: scale(1.015); box-shadow: 0 8px 28px rgba(232,115,42,0.35) !important; }
          .auth-link:hover { text-decoration: underline; }
        }
      `}</style>

      <div style={{position:'absolute',top:'-10%',left:'-10%',width:'50vw',height:'50vw',borderRadius:'50%',background:'rgba(232,115,42,0.18)',filter:'blur(90px)',pointerEvents:'none'}}/>
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
        maxWidth:'400px',
        position:'relative',
        zIndex:1,
      }}>
        <a href="/" style={{display:'block',marginBottom:'24px'}}>
          <img src="/SportSpot-Logo-Light.png" alt="SportSpot" style={{height:'44px',width:'auto'}}/>
        </a>
        <p style={{color:'#6e6e73',marginBottom:'28px',fontSize:'14px',letterSpacing:'-0.1px'}}>Venue Manager Login</p>
        <input
          className="auth-input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />
        {error && (
          <p style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',padding:'10px 12px',color:'#dc2626',fontSize:'13px',marginBottom:'12px'}}>{error}</p>
        )}
        <button
          className="auth-submit"
          onClick={handleLogin}
          disabled={loading}
          style={{width:'100%',background:'#e8732a',color:'white',border:'none',borderRadius:'980px',padding:'15px',fontSize:'16px',fontWeight:'600',letterSpacing:'-0.2px',cursor:'pointer',marginBottom:'16px',boxShadow:'0 4px 20px rgba(232,115,42,0.3)'}}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <p style={{color:'#6e6e73',fontSize:'13px',textAlign:'center'}}>
          No account? <a href="/register" className="auth-link" style={{color:'#e8732a',fontWeight:'600'}}>Register your venue</a>
        </p>
        <div style={{borderTop:'1px solid rgba(0,0,0,0.08)',marginTop:'20px',paddingTop:'16px',textAlign:'center'}}>
          <a href="/" className="auth-link" style={{color:'#aeaeb2',fontSize:'12px'}}>← Return to Home Page</a>
        </div>
      </div>
    </div>
  )
}
