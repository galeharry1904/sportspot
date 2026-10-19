'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Download, Share, X } from '../lib/icons'

// Pages where this would either collide with existing fixed UI (the /map
// bottom sheet) or isn't the right moment to ask (venue/admin/auth flows —
// this prompt is about giving fans the app, not venue managers).
const HIDDEN_PATHS = ['/map', '/admin', '/dashboard', '/setup', '/login', '/register', '/fan/login', '/fan/register']

const DISMISS_KEY = 'sportspot-install-dismissed' // session-only: X or "Got It"
const INSTALLED_KEY = 'sportspot-installed' // permanent: only set once they confirm it's added

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIOS() {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  // iPadOS 13+ Safari reports as "Macintosh" — only real Macs lack touch.
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

// Desktop Safari (macOS) has no beforeinstallprompt API — like iOS, the only
// path is a manual one ("Add to Dock"), so it needs its own detection branch.
function isMacSafari() {
  if (navigator.platform !== 'MacIntel' || navigator.maxTouchPoints > 1) return false
  const ua = navigator.userAgent
  return navigator.vendor === 'Apple Computer, Inc.' && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Edg|OPR|Brave/.test(ua)
}

export default function InstallPrompt() {
  const pathname = usePathname()
  const [platform, setPlatform] = useState(null) // 'ios' | 'mac-safari' | 'native'
  const [showSheet, setShowSheet] = useState(false)
  const deferredPromptRef = useRef(null)

  useEffect(() => {
    if (isStandalone()) return
    if (localStorage.getItem(INSTALLED_KEY)) return
    if (sessionStorage.getItem(DISMISS_KEY)) return

    if (isIOS()) {
      setPlatform('ios')
      return
    }
    if (isMacSafari()) {
      setPlatform('mac-safari')
      return
    }

    // Any browser offering a native install flow — Chrome/Edge on Windows,
    // macOS, Linux or Android all fire this the same way.
    function onBeforeInstallPrompt(e) {
      e.preventDefault()
      deferredPromptRef.current = e
      setPlatform('native')
    }
    function onAppInstalled() {
      // Authoritative signal the install actually completed — permanent.
      localStorage.setItem(INSTALLED_KEY, '1')
      setPlatform(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  // Session-only: the X, or "Got It" — reappears next visit until installed.
  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setPlatform(null)
    setShowSheet(false)
  }

  // Permanent: only once they confirm they've actually added it.
  function markInstalled() {
    localStorage.setItem(INSTALLED_KEY, '1')
    setPlatform(null)
    setShowSheet(false)
  }

  async function handleClick() {
    if (platform === 'ios' || platform === 'mac-safari') {
      setShowSheet(true)
      return
    }
    const deferredPrompt = deferredPromptRef.current
    if (!deferredPrompt) { dismiss(); return }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPromptRef.current = null
    if (outcome === 'accepted') markInstalled()
    else dismiss()
  }

  if (!platform || HIDDEN_PATHS.some(p => pathname?.startsWith(p))) return null

  // The homepage has its own always-on "Plan Your Day" FAB pinned
  // bottom-right — stack above it there instead of colliding on narrow screens.
  const isHome = pathname === '/'

  return (
    <>
      <style>{`
        @keyframes installFabIn { from { opacity:0; transform:translateY(16px) scale(0.94); } to { opacity:1; transform:translateY(0) scale(1); } }
        .install-fab { animation: installFabIn 0.5s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        @media (prefers-reduced-motion: reduce) { .install-fab { animation: none; } }
        @media (hover: hover) and (pointer: fine) {
          .install-fab-btn:hover { background: #fafafa !important; }
        }
        .install-label-desktop { display: none; }
        .install-sheet-overlay { align-items: flex-end; }
        .install-sheet-card { border-radius: 24px 24px 0 0; box-shadow: 0 -8px 40px rgba(0,0,0,0.15); }
        .install-sheet-handle { display: block; }
        @media (min-width: 769px) {
          .install-label-mobile { display: none; }
          .install-label-desktop { display: inline; }
          .install-sheet-overlay { align-items: center; }
          .install-sheet-card { border-radius: 20px; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); animation: installSheetIn 0.25s ease both; }
          .install-sheet-handle { display: none; }
        }
        @keyframes installSheetIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
      `}</style>

      <div className="install-fab" style={isHome
        ? {position:'fixed',bottom:'104px',right:'24px',zIndex:80,display:'flex',alignItems:'center',gap:'6px'}
        : {position:'fixed',bottom:'24px',left:'24px',zIndex:80,display:'flex',alignItems:'center',gap:'6px'}}>
        <button onClick={handleClick} className="install-fab-btn"
          style={{display:'flex',alignItems:'center',gap:'10px',background:'rgba(255,255,255,0.9)',backdropFilter:'saturate(200%) blur(20px)',WebkitBackdropFilter:'saturate(200%) blur(20px)',color:'#152238',border:'1px solid rgba(0,0,0,0.08)',borderRadius:'20px',padding:'12px 18px 12px 14px',maxWidth:'240px',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.08)',transition:'background 0.15s ease'}}>
          <Download size={18} strokeWidth={2} color="#e8732a" style={{flexShrink:0}}/>
          <span style={{textAlign:'left'}}>
            <span style={{display:'block',fontSize:'13px',fontWeight:'700',letterSpacing:'-0.1px'}}>
              {platform === 'mac-safari' ? 'Add to Dock' : platform === 'native' ? (
                <><span className="install-label-mobile">Add to Home Screen</span><span className="install-label-desktop">Install SportSpot</span></>
              ) : 'Add to Home Screen'}
            </span>
            <span style={{display:'block',fontSize:'11px',color:'#6e6e73',marginTop:'1px'}}>
              {platform === 'native' ? (
                <><span className="install-label-mobile">Use SportSpot like an app</span><span className="install-label-desktop">Opens in its own window</span></>
              ) : 'Use SportSpot like an app'}
            </span>
          </span>
        </button>
        <button onClick={dismiss} aria-label="Dismiss"
          style={{width:'28px',height:'28px',borderRadius:'50%',background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',border:'1px solid rgba(0,0,0,0.08)',color:'#8e8e93',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
          <X size={13} strokeWidth={2}/>
        </button>
      </div>

      {showSheet && (
        <div onClick={dismiss} className="install-sheet-overlay" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',justifyContent:'center'}}>
          <div onClick={e => e.stopPropagation()} className="install-sheet-card" style={{background:'white',padding:'28px 24px 36px',width:'100%',maxWidth:'480px'}}>
            <div className="install-sheet-handle" style={{width:'36px',height:'4px',background:'rgba(0,0,0,0.12)',borderRadius:'2px',margin:'0 auto 20px'}}/>
            <h3 style={{fontSize:'17px',fontWeight:'700',color:'#152238',marginBottom:'4px',letterSpacing:'-0.2px'}}>
              {platform === 'mac-safari' ? 'Add SportSpot to your Dock' : 'Add SportSpot to your Home Screen'}
            </h3>
            <p style={{fontSize:'13px',color:'#6e6e73',marginBottom:'20px',lineHeight:'1.5'}}>
              {platform === 'mac-safari' ? 'Use it like a desktop app, with its own icon in the Dock.' : 'Use it like an app, with its own icon — no App Store needed.'}
            </p>
            <div style={{display:'flex',alignItems:'flex-start',gap:'12px',marginBottom:'16px'}}>
              <div style={{width:'28px',height:'28px',borderRadius:'8px',background:'rgba(232,115,42,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#e8732a'}}>
                <Share size={15} strokeWidth={2}/>
              </div>
              <p style={{fontSize:'14px',color:'#152238',paddingTop:'3px'}}>
                {platform === 'mac-safari' ? <>Click the <strong>Share</strong> icon in Safari&apos;s toolbar</> : <>Tap the <strong>Share</strong> icon in Safari&apos;s toolbar</>}
              </p>
            </div>
            <div style={{display:'flex',alignItems:'flex-start',gap:'12px',marginBottom:'24px'}}>
              <div style={{width:'28px',height:'28px',borderRadius:'8px',background:'rgba(232,115,42,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#e8732a',fontSize:'13px',fontWeight:'800'}}>+</div>
              <p style={{fontSize:'14px',color:'#152238',paddingTop:'3px'}}>
                {platform === 'mac-safari' ? <>Click <strong>Add to Dock</strong></> : <>Scroll down and tap <strong>Add to Home Screen</strong></>}
              </p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <button onClick={markInstalled} style={{width:'100%',background:'#e8732a',color:'white',border:'none',borderRadius:'980px',padding:'14px',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}>
                {platform === 'mac-safari' ? 'Added to Dock' : 'Added to Home Screen'}
              </button>
              <button onClick={dismiss} style={{width:'100%',background:'transparent',color:'#6e6e73',border:'none',borderRadius:'980px',padding:'10px',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}>Got It</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
