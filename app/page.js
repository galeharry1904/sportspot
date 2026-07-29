'use client'
import { useState, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { User, ClipboardList, MapPin, Beer, CheckCircle2, Tv, FootballIcon, Menu, X, ArrowRight } from '../lib/icons'
import { supabase } from '../lib/supabase'
import { CURRENT_SEASON, CURRENT_SEASON_LABEL } from '../lib/season'
import { standingsRowAccent, COMPETITION_SIZE } from '../lib/leagueTable'

const PREVIEW_COMPETITIONS = ['Premier League', 'Championship']

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function NewsCard({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-card"
      style={{display:'block',background:'white',borderRadius:'16px',overflow:'hidden',border:'1px solid rgba(0,0,0,0.06)',boxShadow:'0 2px 12px rgba(0,0,0,0.03)',textDecoration:'none'}}>
      <div style={{aspectRatio:'16/10',background:'#f5f5f7',overflow:'hidden'}}>
        {item.image_url && (
          <img src={item.image_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
        )}
      </div>
      <div style={{padding:'16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
          <span style={{fontSize:'10px',fontWeight:'800',letterSpacing:'0.4px',textTransform:'uppercase',color:'#e8732a',background:'rgba(232,115,42,0.1)',borderRadius:'5px',padding:'2px 7px'}}>{item.source}</span>
          <span style={{fontSize:'11px',color:'#aeaeb2',fontWeight:'500'}}>{timeAgo(item.published_at)}</span>
        </div>
        <div style={{fontSize:'14px',fontWeight:'700',color:'#152238',lineHeight:'1.4',letterSpacing:'-0.1px',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
          {item.title}
        </div>
      </div>
    </a>
  )
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [previewTables, setPreviewTables] = useState({})
  const [news, setNews] = useState([])
  const [transferNews, setTransferNews] = useState([])

  useEffect(() => {
    async function loadPreviewTables() {
      const results = await Promise.all(
        PREVIEW_COMPETITIONS.map(comp =>
          supabase.from('standings').select('*')
            .eq('competition', comp).eq('season', CURRENT_SEASON)
            .order('position').limit(10)
        )
      )
      const byCompetition = {}
      PREVIEW_COMPETITIONS.forEach((comp, i) => { byCompetition[comp] = results[i].data || [] })
      setPreviewTables(byCompetition)
    }
    loadPreviewTables()

    async function loadNews() {
      const { data } = await supabase.from('news').select('*').eq('category', 'news').order('published_at', { ascending: false }).limit(4)
      setNews(data || [])
    }
    loadNews()

    async function loadTransferNews() {
      const { data } = await supabase.from('news').select('*').eq('category', 'transfers').order('published_at', { ascending: false }).limit(4)
      setTransferNews(data || [])
    }
    loadTransferNews()
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Smooth scroll (Lenis) + scroll-triggered reveals (GSAP). Skipped entirely
  // for prefers-reduced-motion — content is fully visible either way, this
  // only controls how it arrives.
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.registerPlugin(ScrollTrigger)

    let lenis = null
    if (!reducedMotion) {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true })
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add((time) => lenis.raf(time * 1000))
      gsap.ticker.lagSmoothing(0)
    }

    const ctx = gsap.context(() => {
      const revealGroups = [
        { selector: '.step-card', stagger: 0.1 },
        { selector: '.feature-card', stagger: 0.08 },
        { selector: '.news-card', stagger: 0.08 },
        { selector: '.table-preview-card', stagger: 0.1 },
      ]
      revealGroups.forEach(({ selector, stagger }) => {
        const els = gsap.utils.toArray(selector)
        if (!els.length) return
        if (reducedMotion) { gsap.set(els, { opacity: 1, y: 0 }); return }
        gsap.fromTo(els,
          { opacity: 0, y: 32 },
          {
            opacity: 1, y: 0, stagger, duration: 0.7, ease: 'power3.out',
            scrollTrigger: { trigger: els[0].closest('.steps-grid, .features-grid, .news-grid, .tables-grid') || els[0], start: 'top 85%' },
          }
        )
      })

      const ctaInner = document.querySelector('.cta-inner')
      if (ctaInner) {
        if (reducedMotion) { gsap.set(ctaInner, { opacity: 1, y: 0 }) }
        else {
          gsap.fromTo(ctaInner,
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
              scrollTrigger: { trigger: ctaInner, start: 'top 85%' } }
          )
        }
      }

      if (!reducedMotion) {
        gsap.utils.toArray('.hero-orb').forEach((orb, i) => {
          gsap.to(orb, {
            y: (i % 2 === 0 ? -1 : 1) * 80,
            ease: 'none',
            scrollTrigger: { trigger: orb, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
          })
        })
      }
    })

    return () => {
      ctx.revert()
      lenis?.destroy()
    }
  }, [])

  return (
    <div style={{background:'#f5f5f7',minHeight:'100vh',color:'#152238',fontFamily:"-apple-system,'SF Pro Display','SF Pro Text',BlinkMacSystemFont,'Helvetica Neue',sans-serif"}}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, -30px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -20px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-10px, 20px); }
        }

        .hero-headline { animation: fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .hero-sub { animation: fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
        .hero-btns { animation: fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        .hero-badge { animation: fadeIn 0.8s ease 0.05s both; }
        .hero-glass { animation: scaleIn 0.8s cubic-bezier(0.22,1,0.36,1) 0.05s both; }

        .step-card {
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
        }
        .step-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 64px rgba(0,0,0,0.1) !important;
        }
        .feature-card {
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.07) !important;
        }
        .table-preview-card {
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
        }
        .table-preview-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.07) !important;
        }
        .news-card {
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease;
        }
        .news-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.07) !important;
        }
        .cta-btn-primary {
          transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
          display: inline-block;
          text-decoration: none;
        }
        .cta-btn-primary:hover {
          transform: scale(1.03);
          box-shadow: 0 12px 40px rgba(232,115,42,0.45) !important;
        }
        .cta-btn-secondary {
          transition: all 0.25s ease;
          display: inline-block;
          text-decoration: none;
        }
        .cta-btn-secondary:hover {
          background: rgba(255,255,255,0.75) !important;
        }
        .nav-link {
          transition: color 0.2s ease;
          text-decoration: none;
        }
        .nav-link:hover { color: #152238 !important; }

        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .hero-inner { padding: 60px 20px 80px !important; }
          .hero-glass-pad { padding: 40px 24px !important; }
          .hero-headline { font-size: 42px !important; letter-spacing: -2px !important; }
          .hero-sub { font-size: 17px !important; }
          .hero-btns { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .hero-btns a { text-align: center !important; padding: 15px 24px !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .tables-grid { grid-template-columns: 1fr !important; }
          .news-grid { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; }
          .section-title { font-size: 34px !important; letter-spacing: -1.5px !important; }
          .section-sub { font-size: 17px !important; }
          .hiw-section { padding: 80px 24px !important; }
          .features-section { padding: 80px 24px !important; }
          .tables-section { padding: 80px 24px !important; }
          .news-section { padding: 80px 24px !important; }
          .cta-section { padding: 80px 24px !important; }
          .cta-inner { padding: 48px 28px !important; }
          .stat-row { flex-direction: column !important; gap: 28px !important; }
          .footer-inner { flex-direction: column !important; align-items: center !important; text-align: center !important; gap: 20px !important; }
          .footer-links { justify-content: center !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        height:'52px',
        background: scrolled ? 'rgba(245,245,247,0.72)' : 'rgba(245,245,247,0.4)',
        backdropFilter: 'saturate(200%) blur(28px)',
        WebkitBackdropFilter: 'saturate(200%) blur(28px)',
        borderBottom: `1px solid ${scrolled ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)'}`,
        transition: 'background 0.4s ease, border-color 0.4s ease',
        display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px',
      }}>
        <a href="/">
          <img src="/SportSpot-Logo-Light.png" alt="SportSpot" style={{height:'40px',width:'auto'}}/>
        </a>

        <div className="nav-desktop" style={{display:'flex',gap:'4px',alignItems:'center'}}>
          {[{href:'/map',label:'Find Pubs'},{href:'/leagues',label:'Leagues'},{href:'/login',label:'Venue Login'}].map(item => (
            <a key={item.href} href={item.href} className="nav-link"
              style={{color:'#6e6e73',fontSize:'14px',fontWeight:'400',padding:'6px 14px',borderRadius:'8px',letterSpacing:'-0.1px'}}>
              {item.label}
            </a>
          ))}
          <a href="/register"
            style={{background:'#e8732a',color:'white',fontSize:'13px',fontWeight:'600',padding:'7px 18px',borderRadius:'980px',marginLeft:'4px',letterSpacing:'-0.1px',textDecoration:'none',transition:'opacity 0.2s'}}>
            Register Venue
          </a>
        </div>

        <button className="nav-hamburger" onClick={() => setMenuOpen(p => !p)}
          style={{display:'none',background:'none',border:'none',cursor:'pointer',padding:'8px',alignItems:'center',justifyContent:'center',color:'#152238'}}>
          {menuOpen ? <X size={18} strokeWidth={1.75}/> : <Menu size={18} strokeWidth={1.75}/>}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{position:'fixed',top:'52px',left:0,right:0,zIndex:99,background:'rgba(245,245,247,0.92)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',borderBottom:'1px solid rgba(0,0,0,0.08)',padding:'12px 24px 20px',display:'flex',flexDirection:'column',gap:'2px'}}>
          {[{href:'/map',label:'Find Pubs'},{href:'/leagues',label:'Leagues'},{href:'/fan/login',label:'Fan Sign In'},{href:'/login',label:'Venue Login'}].map(item => (
            <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
              style={{color:'#152238',fontSize:'17px',fontWeight:'400',padding:'14px 0',borderBottom:'1px solid rgba(0,0,0,0.06)',letterSpacing:'-0.2px',textDecoration:'none',display:'block'}}>
              {item.label}
            </a>
          ))}
          <a href="/register" onClick={() => setMenuOpen(false)}
            style={{marginTop:'12px',background:'#e8732a',color:'white',fontSize:'16px',fontWeight:'600',padding:'14px',borderRadius:'14px',textAlign:'center',letterSpacing:'-0.2px',textDecoration:'none',display:'block'}}>
            Register Venue
          </a>
        </div>
      )}

      {/* ── HERO ── */}
      <div style={{
        paddingTop:'52px',
        position:'relative',
        overflow:'hidden',
        minHeight:'100vh',
        display:'flex',
        alignItems:'center',
        background:'linear-gradient(135deg, #fff8f3 0%, #ffffff 25%, #f0f4ff 55%, #f8f0ff 80%, #fff5f0 100%)',
      }}>
        {/* Colour orbs — large blurred blobs that make the glass effect dramatic */}
        <div className="hero-orb" style={{position:'absolute',top:'-5%',left:'-5%',width:'55vw',height:'55vw',borderRadius:'50%',background:'rgba(232,115,42,0.22)',filter:'blur(80px)',animation:'floatA 9s ease-in-out infinite',pointerEvents:'none'}}/>
        <div className="hero-orb" style={{position:'absolute',top:'15%',right:'-10%',width:'50vw',height:'50vw',borderRadius:'50%',background:'rgba(99,102,241,0.15)',filter:'blur(90px)',animation:'floatB 11s ease-in-out infinite',pointerEvents:'none'}}/>
        <div className="hero-orb" style={{position:'absolute',bottom:'-10%',left:'25%',width:'60vw',height:'40vw',borderRadius:'50%',background:'rgba(168,85,247,0.1)',filter:'blur(100px)',animation:'floatC 13s ease-in-out infinite',pointerEvents:'none'}}/>
        <div className="hero-orb" style={{position:'absolute',top:'40%',left:'35%',width:'30vw',height:'30vw',borderRadius:'50%',background:'rgba(232,115,42,0.1)',filter:'blur(60px)',pointerEvents:'none'}}/>

        <div className="hero-inner" style={{maxWidth:'860px',margin:'0 auto',padding:'80px 24px 100px',textAlign:'center',position:'relative',zIndex:1,width:'100%'}}>

          {/* Glass card */}
          <div className="hero-glass" style={{
            background:'rgba(255,255,255,0.45)',
            backdropFilter:'saturate(200%) blur(32px)',
            WebkitBackdropFilter:'saturate(200%) blur(32px)',
            borderRadius:'32px',
            border:'1px solid rgba(255,255,255,0.65)',
            boxShadow:'0 8px 64px rgba(0,0,0,0.06), 0 2px 0 rgba(255,255,255,0.8) inset',
            padding:'64px 56px',
          }}>
            <div className="hero-glass-pad">

              <div className="hero-badge" style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(232,115,42,0.1)',border:'1px solid rgba(232,115,42,0.25)',borderRadius:'980px',padding:'6px 16px',marginBottom:'28px'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#e8732a'}}/>
                <span style={{fontSize:'13px',color:'#e8732a',fontWeight:'500',letterSpacing:'0.1px'}}>Live in London</span>
              </div>

              <h1 className="hero-headline" style={{fontSize:'68px',fontWeight:'700',lineHeight:'1.03',letterSpacing:'-3px',color:'#152238',marginBottom:'20px'}}>
                Find a pub showing<br/>
                <span style={{color:'#e8732a'}}>the game you want.</span>
              </h1>

              <p className="hero-sub" style={{fontSize:'20px',color:'#6e6e73',maxWidth:'520px',margin:'0 auto 36px',lineHeight:'1.6',fontWeight:'400',letterSpacing:'-0.3px'}}>
                Real-time confirmed sports schedules from London venues. No guessing. No wasted journeys.
              </p>

              <div className="hero-btns" style={{display:'flex',gap:'12px',justifyContent:'center',alignItems:'center',flexWrap:'wrap'}}>
                <a href="/map" className="cta-btn-primary"
                  style={{background:'#e8732a',color:'white',padding:'15px 36px',borderRadius:'980px',fontSize:'17px',fontWeight:'600',letterSpacing:'-0.3px',boxShadow:'0 4px 20px rgba(232,115,42,0.3)'}}>
                  Find a Pub
                </a>
                <a href="/fan/register" className="cta-btn-secondary"
                  style={{background:'rgba(255,255,255,0.5)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',color:'#152238',padding:'15px 36px',borderRadius:'980px',fontSize:'17px',fontWeight:'600',letterSpacing:'-0.3px',border:'1px solid rgba(0,0,0,0.1)'}}>
                  Create Fan Account
                </a>
              </div>

              <p style={{fontSize:'13px',color:'#aeaeb2',marginTop:'20px',letterSpacing:'-0.1px'}}>Free for fans · Free for venues to list</p>
            </div>
          </div>

          {/* Stats */}
          <div className="stat-row" style={{display:'flex',justifyContent:'center',gap:'64px',marginTop:'48px'}}>
            {[
              {value:'Real-time',label:'Fixture updates'},
              {value:'London',label:'Coverage area'},
              {value:'Free',label:'For fans always'},
            ].map(s => (
              <div key={s.label} style={{textAlign:'center'}}>
                <div style={{fontSize:'26px',fontWeight:'700',color:'#152238',letterSpacing:'-1px',marginBottom:'4px'}}>{s.value}</div>
                <div style={{fontSize:'13px',color:'#aeaeb2',fontWeight:'400'}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="hiw-section" style={{padding:'120px 24px',background:'#f5f5f7'}}>
        <div style={{maxWidth:'1080px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'64px'}}>
            <div style={{fontSize:'13px',fontWeight:'600',letterSpacing:'0.5px',textTransform:'uppercase',color:'#e8732a',marginBottom:'12px'}}>How it works</div>
            <h2 className="section-title" style={{fontSize:'48px',fontWeight:'700',letterSpacing:'-2px',color:'#152238',marginBottom:'16px'}}>Find your pub in 4 steps</h2>
            <p className="section-sub" style={{fontSize:'19px',color:'#6e6e73',fontWeight:'400',letterSpacing:'-0.3px'}}>Designed to get you to the right pub, fast.</p>
          </div>
          <div className="steps-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px'}}>
            {[
              {step:'01',icon:User,title:'Create your account',desc:'Sign up and tell SportSpot which sports and teams you follow. We do the rest.'},
              {step:'02',icon:ClipboardList,title:'Venues confirm daily',desc:'Pub managers log in each match day and confirm exactly which games they are showing.'},
              {step:'03',icon:MapPin,title:'Open the fan map',desc:'See every confirmed venue near you on a live map, sorted by distance.'},
              {step:'04',icon:Beer,title:'Head to the right pub',desc:'Pick a venue, check the kick-off time, and walk in knowing exactly what is on screen.'},
            ].map((s) => (
              <div key={s.step} className="step-card" style={{background:'white',borderRadius:'20px',padding:'32px 28px',position:'relative',boxShadow:'0 4px 24px rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.04)'}}>
                <div style={{position:'absolute',top:'20px',right:'24px',fontSize:'13px',fontWeight:'700',color:'rgba(0,0,0,0.08)',letterSpacing:'1px'}}>{s.step}</div>
                <div style={{width:'48px',height:'48px',borderRadius:'14px',background:'rgba(232,115,42,0.08)',display:'flex',alignItems:'center',justifyContent:'center',color:'#e8732a',marginBottom:'20px'}}><s.icon size={22} strokeWidth={1.75}/></div>
                <div style={{fontWeight:'600',fontSize:'16px',marginBottom:'10px',color:'#152238',letterSpacing:'-0.3px'}}>{s.title}</div>
                <div style={{fontSize:'14px',color:'#6e6e73',lineHeight:'1.6',fontWeight:'400'}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div className="features-section" style={{padding:'120px 24px',background:'white'}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'64px'}}>
            <div style={{fontSize:'13px',fontWeight:'600',letterSpacing:'0.5px',textTransform:'uppercase',color:'#e8732a',marginBottom:'12px'}}>Why SportSpot</div>
            <h2 className="section-title" style={{fontSize:'48px',fontWeight:'700',letterSpacing:'-2px',color:'#152238',marginBottom:'16px'}}>No more wasted trips.</h2>
            <p className="section-sub" style={{fontSize:'19px',color:'#6e6e73',fontWeight:'400',letterSpacing:'-0.3px',maxWidth:'500px',margin:'0 auto'}}>Every feature built around one goal — getting you to the right pub.</p>
          </div>
          <div className="features-grid" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px'}}>
            {[
              {icon:CheckCircle2,title:'Verified every match day',desc:'Pub managers confirm their lineup daily. Outdated data never appears on the map.'},
              {icon:FootballIcon,title:'Every sport covered',desc:'Football, rugby, F1, cricket, tennis and more. Filter by sport to find exactly what you need.'},
              {icon:Tv,title:'Sky and TNT Sports',desc:'See exactly which pubs have which subscriptions so you never miss a game on a specific channel.'},
              {icon:MapPin,title:'Near you, right now',desc:'The fan map uses your location to show confirmed pubs sorted by distance.'},
            ].map(f => (
              <div key={f.title} className="feature-card"
                style={{background:'#f5f5f7',border:'1px solid rgba(0,0,0,0.04)',borderRadius:'20px',padding:'32px',display:'flex',gap:'20px',alignItems:'flex-start',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'white',display:'flex',alignItems:'center',justifyContent:'center',color:'#e8732a',flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                  <f.icon size={20} strokeWidth={1.75}/>
                </div>
                <div>
                  <div style={{fontWeight:'600',fontSize:'16px',marginBottom:'8px',color:'#152238',letterSpacing:'-0.3px'}}>{f.title}</div>
                  <div style={{fontSize:'14px',color:'#6e6e73',lineHeight:'1.6',fontWeight:'400'}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── NEWS ── */}
      <div className="news-section" style={{padding:'120px 24px',background:'white'}}>
        <div style={{maxWidth:'1080px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={{fontSize:'13px',fontWeight:'600',letterSpacing:'0.5px',textTransform:'uppercase',color:'#e8732a',marginBottom:'12px'}}>Latest News</div>
            <h2 className="section-title" style={{fontSize:'48px',fontWeight:'700',letterSpacing:'-2px',color:'#152238',marginBottom:'16px'}}>From the world of football.</h2>
            <p className="section-sub" style={{fontSize:'19px',color:'#6e6e73',fontWeight:'400',letterSpacing:'-0.3px',maxWidth:'500px',margin:'0 auto'}}>Headlines from BBC Sport and The Guardian — no need to leave SportSpot.</p>
          </div>
          {news.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'#aeaeb2',fontSize:'14px'}}>Loading latest news…</div>
          ) : (
            <div className="news-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px'}}>
              {news.map(item => <NewsCard key={item.id} item={item}/>)}
            </div>
          )}
        </div>
      </div>

      {/* ── TRANSFER NEWS ── */}
      <div className="news-section" style={{padding:'120px 24px',background:'#f5f5f7',borderTop:'1px solid rgba(0,0,0,0.04)'}}>
        <div style={{maxWidth:'1080px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={{fontSize:'13px',fontWeight:'600',letterSpacing:'0.5px',textTransform:'uppercase',color:'#e8732a',marginBottom:'12px'}}>Transfer News</div>
            <h2 className="section-title" style={{fontSize:'48px',fontWeight:'700',letterSpacing:'-2px',color:'#152238',marginBottom:'16px'}}>Deals, done and rumoured.</h2>
            <p className="section-sub" style={{fontSize:'19px',color:'#6e6e73',fontWeight:'400',letterSpacing:'-0.3px',maxWidth:'500px',margin:'0 auto'}}>Transfer gossip and confirmed signings from BBC Sport and The Guardian.</p>
          </div>
          {transferNews.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'#aeaeb2',fontSize:'14px'}}>Loading transfer news…</div>
          ) : (
            <div className="news-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px'}}>
              {transferNews.map(item => <NewsCard key={item.id} item={item}/>)}
            </div>
          )}
        </div>
      </div>

      {/* ── LEAGUE TABLES ── */}
      <div className="tables-section" style={{padding:'120px 24px',background:'#f5f5f7',borderTop:'1px solid rgba(0,0,0,0.04)'}}>
        <div style={{maxWidth:'1080px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'56px'}}>
            <div style={{fontSize:'13px',fontWeight:'600',letterSpacing:'0.5px',textTransform:'uppercase',color:'#e8732a',marginBottom:'12px'}}>Live Standings</div>
            <h2 className="section-title" style={{fontSize:'48px',fontWeight:'700',letterSpacing:'-2px',color:'#152238',marginBottom:'16px'}}>This season&apos;s tables.</h2>
            <p className="section-sub" style={{fontSize:'19px',color:'#6e6e73',fontWeight:'400',letterSpacing:'-0.3px',maxWidth:'500px',margin:'0 auto'}}>Premier League and Championship, synced automatically — no need to leave SportSpot.</p>
          </div>
          <div className="tables-grid" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'20px'}}>
            {PREVIEW_COMPETITIONS.map(comp => {
              const rows = previewTables[comp] || []
              const total = COMPETITION_SIZE[comp]
              return (
                <div key={comp} className="table-preview-card" style={{background:'white',border:'1px solid rgba(0,0,0,0.04)',borderRadius:'20px',overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.03)'}}>
                  <div style={{padding:'24px 24px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontWeight:'700',fontSize:'17px',color:'#152238',letterSpacing:'-0.3px'}}>{comp}</div>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'#aeaeb2',letterSpacing:'0.3px'}}>{CURRENT_SEASON_LABEL}</div>
                  </div>
                  {rows.length === 0 ? (
                    <div style={{padding:'40px 24px',textAlign:'center',color:'#aeaeb2',fontSize:'13px'}}>Table loading…</div>
                  ) : (
                    <div>
                      <div style={{display:'grid',gridTemplateColumns:'28px 1fr 32px 36px',gap:'6px',padding:'0 24px 8px'}}>
                        {['#','Club','GD','Pts'].map(h => (
                          <span key={h} style={{fontSize:'9px',fontWeight:'800',letterSpacing:'0.5px',color:'#c7c7cc',textAlign: h==='Club' ? 'left' : 'center'}}>{h}</span>
                        ))}
                      </div>
                      {rows.map(row => {
                        const accent = standingsRowAccent(comp, row.position, total)
                        return (
                          <div key={row.id} style={{display:'grid',gridTemplateColumns:'28px 1fr 32px 36px',gap:'6px',padding:'9px 24px',alignItems:'center',borderLeft:`3px solid ${accent}`,borderTop:'1px solid rgba(0,0,0,0.04)'}}>
                            <span style={{fontSize:'12px',fontWeight:'700',color:'#152238',textAlign:'center'}}>{row.position}</span>
                            <span style={{fontSize:'13px',fontWeight:'600',color:'#152238',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.team}</span>
                            <span style={{fontSize:'11px',color:'#8e8e93',textAlign:'center'}}>{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</span>
                            <span style={{fontSize:'13px',fontWeight:'800',color:'#152238',textAlign:'center'}}>{row.points}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <a href={`/leagues?competition=${encodeURIComponent(comp)}`}
                    style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',padding:'14px',fontSize:'13px',fontWeight:'700',color:'#e8732a',textDecoration:'none',borderTop:'1px solid rgba(0,0,0,0.06)',background:'#fff8f3'}}>
                    View Full Table <ArrowRight size={13} strokeWidth={2.5}/>
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="cta-section" style={{padding:'120px 24px',background:'#f5f5f7',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'600px',height:'400px',background:'radial-gradient(ellipse, rgba(232,115,42,0.12) 0%, transparent 65%)',pointerEvents:'none'}}/>
        <div style={{maxWidth:'760px',margin:'0 auto',position:'relative',zIndex:1}}>
          <div className="cta-inner" style={{
            background:'rgba(255,255,255,0.6)',
            backdropFilter:'saturate(200%) blur(32px)',
            WebkitBackdropFilter:'saturate(200%) blur(32px)',
            borderRadius:'28px',
            padding:'72px 64px',
            textAlign:'center',
            boxShadow:'0 8px 48px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
            border:'1px solid rgba(255,255,255,0.8)',
          }}>
            <div style={{fontSize:'13px',fontWeight:'600',letterSpacing:'0.5px',textTransform:'uppercase',color:'#e8732a',marginBottom:'16px'}}>Ready</div>
            <h2 style={{fontSize:'40px',fontWeight:'700',letterSpacing:'-1.5px',color:'#152238',marginBottom:'16px'}}>Find your pub now.</h2>
            <p style={{color:'#6e6e73',marginBottom:'36px',fontSize:'18px',fontWeight:'400',letterSpacing:'-0.2px',lineHeight:'1.6'}}>Open the live map and find a confirmed venue near you right now.</p>
            <a href="/map" className="cta-btn-primary"
              style={{background:'#e8732a',color:'white',padding:'16px 48px',borderRadius:'980px',fontSize:'17px',fontWeight:'600',letterSpacing:'-0.3px',boxShadow:'0 4px 20px rgba(232,115,42,0.25)'}}>
              Open the Fan Map
            </a>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{background:'white',borderTop:'1px solid rgba(0,0,0,0.06)',padding:'32px 24px'}}>
        <div className="footer-inner" style={{maxWidth:'1080px',margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <img src="/SportSpot-Logo-Light.png" alt="SportSpot" style={{height:'28px',width:'auto'}}/>
          <p style={{color:'#aeaeb2',fontSize:'13px',fontWeight:'400'}}>© 2026 SportSpot. All rights reserved.</p>
          <div className="footer-links" style={{display:'flex',gap:'24px'}}>
            {[{href:'/map',label:'Find Pubs'},{href:'/leagues',label:'Leagues'},{href:'/login',label:'Venue Login'},{href:'/register',label:'Register'}].map(item => (
              <a key={item.href} href={item.href} className="nav-link" style={{color:'#aeaeb2',fontSize:'13px',fontWeight:'400'}}>{item.label}</a>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}