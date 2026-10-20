"use client";

/**
 * "Find your pub in 4 steps" — animated section (Option A: Matchday Route)
 *
 * Desktop/tablet (>560px): a single shared 12-second loop — a marker travels
 * along the route and each step card comes forward in turn while its
 * illustration plays, exactly as before.
 *
 * Mobile (<=560px): each step plays its own illustration once, independently,
 * as it scrolls into view — driven by IntersectionObserver below. The CSS
 * module redefines every animation-name under its 560px media query to a
 * self-contained "...M" keyframe set (instead of a slice of the shared 12s
 * clock) and gates playback on a `.inView` class this component toggles per
 * step. Respects prefers-reduced-motion either way (everything shows in its
 * finished state, nothing moves).
 */
import { useEffect, useRef, useState } from "react";
import s from "./FindYourPubSteps.module.css";

type Step = {
  title: string;
  copy: string;
  Art: () => React.JSX.Element;
  cardClass: string;
  activeNumberClass?: string;
};

const STEPS: Step[] = [
  {
    title: "Create your account",
    copy: "Sign up and tell SportSpot which sports and teams you follow. We do the rest.",
    Art: TeamsArt,
    cardClass: s.c1,
  },
  {
    title: "Venues confirm daily",
    copy: "Pub managers log in each match day and confirm exactly which games they are showing.",
    Art: FixturesArt,
    cardClass: s.c2,
    activeNumberClass: s.n2,
  },
  {
    title: "Open the fan map",
    copy: "See every confirmed venue near you on a live map, sorted by distance.",
    Art: FanMapArt,
    cardClass: s.c3,
    activeNumberClass: s.n3,
  },
  {
    title: "Head to the right pub",
    copy: "Pick a venue, check the kick-off time, and walk in knowing exactly what is on screen.",
    Art: PubArt,
    cardClass: s.c4,
    activeNumberClass: s.n4,
  },
];

export default function FindYourPubSteps() {
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [visible, setVisible] = useState<boolean[]>(() => STEPS.map(() => false));

  useEffect(() => {
    // Only matters on mobile (the CSS only gates playback on .inView under its
    // 560px query), but observing everywhere is harmless and keeps this
    // effect simple — the class is inert above that width.
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          let changed = false;
          const next = [...prev];
          for (const entry of entries) {
            const index = stepRefs.current.indexOf(entry.target as HTMLLIElement);
            if (index === -1 || next[index] || !entry.isIntersecting) continue;
            next[index] = true;
            changed = true;
          }
          return changed ? next : prev;
        });
      },
      { threshold: 0.35 }
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className={s.section} aria-labelledby="find-your-pub-title">
      <div className={s.inner}>
        <header className={s.header}>
          <h2 id="find-your-pub-title" className={s.title}>
            Find your pub in 4 steps
          </h2>
          <p className={s.subtitle}>Designed to get you to the right pub, fast.</p>
        </header>

        <div className={s.stage}>
          {/* Route track behind the number badges (hidden below 920px) */}
          <div className={s.track} aria-hidden="true">
            <div className={s.trackBase} />
            <div className={`${s.a} ${s.trackProgress}`} />
            <div className={`${s.a} ${s.marker}`}>
              <span className={s.markerPulse} />
              <span className={s.markerDot} />
            </div>
          </div>

          <ol className={s.grid}>
            {STEPS.map(({ title, copy, Art, cardClass, activeNumberClass }, i) => (
              <li
                key={title}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className={`${s.step} ${visible[i] ? s.inView : ""}`}
              >
                <div className={`${s.a} ${s.card} ${cardClass}`}>
                  <Art />
                </div>
                <div className={s.number} aria-hidden="true">
                  {activeNumberClass ? (
                    <>
                      <span className={`${s.badge} ${s.badgeIdle}`}>{i + 1}</span>
                      <span className={`${s.a} ${s.badge} ${s.badgeActive} ${activeNumberClass}`}>{i + 1}</span>
                    </>
                  ) : (
                    <span className={`${s.badge} ${s.badgeActive}`}>{i + 1}</span>
                  )}
                </div>
                <h3 className={s.stepTitle}>{title}</h3>
                <p className={s.stepCopy}>{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- Step illustrations (240 x 180 artboards, scale with the card) ---------- */

function TeamsArt() {
  return (
    <svg className={s.art} viewBox="0 0 240 180" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Choosing Arsenal as a favourite team and switching on email alerts">
    <text x="14" y="22" fontSize="13" fontWeight="700" fill="#152238">Your teams</text>
    <text x="14" y="36" fontSize="9.5" fill="#6e6e73">Football · Premier League</text>
    <g className={`${s.a} ${s.ready}`} style={{ opacity: 1 }}>
    <rect x="160" y="10" width="68" height="20" rx="10" fill="#eafaf0" stroke="#16a34a" strokeOpacity=".35" />
    <path d="M170 20.2l2.6 2.6 5-5.2" fill="none" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <text x="201" y="23.5" fontSize="9" fontWeight="800" fill="#15803d" textAnchor="middle">All set</text>
    </g>
    <g fontSize="10" fontWeight="600" fill="#152238" textAnchor="middle">
    <rect x="14" y="46" width="66" height="26" rx="13" fill="#f5f5f7" stroke="#000" strokeOpacity=".06" /><text x="47" y="62.5">Arsenal</text>
    <rect x="87" y="46" width="66" height="26" rx="13" fill="#f5f5f7" stroke="#000" strokeOpacity=".06" /><text x="120" y="62.5">Chelsea</text>
    <rect x="160" y="46" width="66" height="26" rx="13" fill="#f5f5f7" stroke="#000" strokeOpacity=".06" /><text x="193" y="62.5">Spurs</text>
    <rect x="14" y="78" width="66" height="26" rx="13" fill="#f5f5f7" stroke="#000" strokeOpacity=".06" /><text x="47" y="94.5">Liverpool</text>
    <rect x="87" y="78" width="66" height="26" rx="13" fill="#f5f5f7" stroke="#000" strokeOpacity=".06" /><text x="120" y="94.5">Man City</text>
    <rect x="160" y="78" width="66" height="26" rx="13" fill="#f5f5f7" stroke="#000" strokeOpacity=".06" /><text x="193" y="94.5">West Ham</text>
    </g>
    <g className={`${s.a} ${s.chip1}`} style={{ opacity: 1 }}>
    <rect x="14" y="46" width="66" height="26" rx="13" fill="#e8732a" />
    <path d="M27 53.2l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#152238" />
    <text x="52" y="62.5" fontSize="10" fontWeight="800" fill="#152238" textAnchor="middle">Arsenal</text>
    </g>
    <circle className={`${s.a} ${s.tap1}`} cx="47" cy="59" r="14" fill="rgba(21,34,56,.12)" stroke="#152238" strokeOpacity=".4" strokeWidth="2" style={{ transformBox: "fill-box", transformOrigin: "center", opacity: 0 }} />
    <line x1="14" y1="118" x2="226" y2="118" stroke="#000" strokeOpacity=".07" />
    <text x="14" y="140" fontSize="11" fontWeight="650" fill="#152238">Email alerts</text>
    <text x="14" y="154" fontSize="8.5" fill="#6e6e73">{"9am heads-up when your team's on nearby"}</text>
    <rect x="192" y="129" width="34" height="20" rx="10" fill="#e5e5ea" />
    <circle cx="202" cy="139" r="8" fill="#ffffff" />
    <g className={`${s.a} ${s.tgl1}`} style={{ opacity: 1 }}>
    <rect x="192" y="129" width="34" height="20" rx="10" fill="#22c55e" />
    <circle className={`${s.a} ${s.knob1}`} cx="202" cy="139" r="8" fill="#ffffff" style={{ transform: "translateX(14px)" }} />
    </g>
    </svg>
  );
}

function FixturesArt() {
  return (
    <svg className={s.art} viewBox="0 0 240 180" preserveAspectRatio="xMidYMid meet" role="img" aria-label="A pub manager switching on today's fixtures and confirming the lineup">
    <text x="14" y="22" fontSize="13" fontWeight="700" fill="#152238">{"Today's fixtures"}</text>
    <text x="226" y="22" fontSize="9.5" fill="#6e6e73" textAnchor="end">The Kings Arms</text>
    <g fill="#152238">
    <text x="14" y="52" fontSize="11" fontWeight="700">12:30</text><text x="52" y="52" fontSize="10.5" fontWeight="600">Newcastle v Everton</text>
    <text x="14" y="84" fontSize="11" fontWeight="700">17:30</text><text x="52" y="84" fontSize="10.5" fontWeight="600">Arsenal v Chelsea</text>
    <text x="14" y="116" fontSize="11" fontWeight="700">20:00</text><text x="52" y="116" fontSize="10.5" fontWeight="600">Man City v Liverpool</text>
    </g>
    <line x1="14" y1="64" x2="226" y2="64" stroke="#000" strokeOpacity=".06" />
    <line x1="14" y1="96" x2="226" y2="96" stroke="#000" strokeOpacity=".06" />
    <rect x="192" y="38" width="34" height="20" rx="10" fill="#e5e5ea" /><circle cx="202" cy="48" r="8" fill="#ffffff" />
    <rect x="192" y="70" width="34" height="20" rx="10" fill="#e5e5ea" /><circle cx="202" cy="80" r="8" fill="#ffffff" />
    <rect x="192" y="102" width="34" height="20" rx="10" fill="#e5e5ea" /><circle cx="202" cy="112" r="8" fill="#ffffff" />
    <g className={`${s.a} ${s.t2b}`} style={{ opacity: 1 }}><rect x="192" y="38" width="34" height="20" rx="10" fill="#22c55e" /><circle className={`${s.a} ${s.k2b}`} cx="202" cy="48" r="8" fill="#ffffff" style={{ transform: "translateX(14px)" }} /></g>
    <g className={`${s.a} ${s.t2a}`} style={{ opacity: 1 }}><rect x="192" y="70" width="34" height="20" rx="10" fill="#22c55e" /><circle className={`${s.a} ${s.k2a}`} cx="202" cy="80" r="8" fill="#ffffff" style={{ transform: "translateX(14px)" }} /></g>
    <g className={`${s.a} ${s.t2c}`} style={{ opacity: 1 }}><rect x="192" y="102" width="34" height="20" rx="10" fill="#22c55e" /><circle className={`${s.a} ${s.k2c}`} cx="202" cy="112" r="8" fill="#ffffff" style={{ transform: "translateX(14px)" }} /></g>
    <rect x="14" y="136" width="212" height="32" rx="10" fill="#fefce8" stroke="#eab308" strokeOpacity=".5" />
    <text x="120" y="156" fontSize="10" fontWeight="700" fill="#854d0e" textAnchor="middle">{"Confirm today's lineup"}</text>
    <g className={`${s.a} ${s.bn}`} style={{ opacity: 1, transformBox: "fill-box", transformOrigin: "center" }}>
    <rect x="14" y="136" width="212" height="32" rx="10" fill="#eafaf0" stroke="#16a34a" strokeOpacity=".4" />
    <circle cx="72" cy="152" r="8" fill="#15803d" />
    <path d="M68.4 152.2l2.4 2.4 4.4-4.6" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <text x="128" y="156" fontSize="10.5" fontWeight="800" fill="#15803d" textAnchor="middle">Lineup confirmed</text>
    </g>
    </svg>
  );
}

function FanMapArt() {
  return (
    <svg className={s.art} viewBox="0 0 240 180" preserveAspectRatio="xMidYMid meet" role="img" aria-label="The fan map: confirmed pubs drop onto a map of London, nearest first">
    <defs><clipPath id="ssStepsMapClip"><rect x="0" y="0" width="240" height="180" rx="14" /></clipPath></defs>
    <g clipPath="url(#ssStepsMapClip)">
    <rect x="0" y="0" width="240" height="180" fill="#ebedf0" />
    <path d="M20 20 C 40 12, 70 14, 78 28 C 82 40, 70 52, 52 52 C 34 52, 18 40, 20 20 Z" fill="#d3e8cc" />
    <path d="M150 112 L 196 108 L 198 128 L 152 132 Z" fill="#d3e8cc" />
    <g fill="none" stroke="#ffffff" strokeLinecap="round">
    <path d="M-5 70 C 60 64, 140 60, 245 52" strokeWidth="7" />
    <path d="M110 -5 C 112 40, 108 90, 112 185" strokeWidth="7" />
    <path d="M-5 40 L245 26" strokeWidth="3" />
    <path d="M60 -5 L72 185" strokeWidth="3" />
    <path d="M176 -5 L168 185" strokeWidth="3" />
    <path d="M-5 108 L245 100" strokeWidth="3" />
    </g>
    <g transform="translate(0 66) scale(.72)"><path d="M-5 108 C 10 104, 25 98, 35 92 C 42 86, 41 76, 42 70 C 43 62, 45 56, 52 54 C 62 52, 72 55, 80 57 C 88 58, 92 60, 100 63 C 112 68, 120 70, 128 66 C 134 62, 138 56, 142 60 C 146 66, 146 80, 152 90 C 156 98, 162 102, 168 100 C 176 98, 180 86, 181 76 C 181 66, 181 58, 188 55 C 198 52, 204 56, 206 64 C 208 74, 212 82, 222 80 C 236 76, 250 70, 270 74 S 310 76, 335 72" fill="none" stroke="#bcd6ef" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" /></g>
    <g fontSize="6.5" fontWeight="700" letterSpacing="1" fill="#8b919b"><text x="150" y="18">ISLINGTON</text><text x="18" y="90">SOHO</text><text x="186" y="88">THE CITY</text></g>
    <circle className={s.pulse} cx="110" cy="78" r="9" fill="rgba(47,124,246,.35)" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
    <circle cx="110" cy="78" r="5" fill="#2f7cf6" stroke="#ffffff" strokeWidth="2" />
    <g className={`${s.a} ${s.p3}`} style={{ opacity: 1 }}><path d="M84 52 C 84 52 92 43 92 37 A 8 8 0 0 0 76 37 C 76 43 84 52 84 52 Z" fill="#e8732a" stroke="#ffffff" strokeWidth="1.5" /><circle cx="84" cy="37" r="3" fill="#ffffff" /></g>
    <g className={`${s.a} ${s.p2}`} style={{ opacity: 1 }}><path d="M160 54 C 160 54 168 45 168 39 A 8 8 0 0 0 152 39 C 152 45 160 54 160 54 Z" fill="#e8732a" stroke="#ffffff" strokeWidth="1.5" /><circle cx="160" cy="39" r="3" fill="#ffffff" /></g>
    <g className={`${s.a} ${s.p1}`} style={{ opacity: 1 }}><path d="M128 70 C 128 70 138 59 138 52 A 10 10 0 0 0 118 52 C 118 59 128 70 128 70 Z" fill="#e8732a" stroke="#ffffff" strokeWidth="1.8" /><circle cx="128" cy="52" r="3.6" fill="#ffffff" /></g>
    <g className={`${s.a} ${s.dist}`} style={{ opacity: 1, transformBox: "fill-box", transformOrigin: "0% 50%" }}>
    <rect x="140" y="58" width="50" height="18" rx="9" fill="#ffffff" stroke="#000" strokeOpacity=".08" />
    <text x="165" y="70.5" fontSize="9" fontWeight="800" fill="#b4520f" textAnchor="middle">0.3 mi</text>
    </g>
    <g className={`${s.a} ${s.sheet}`}>
    <rect x="0" y="138" width="240" height="50" rx="12" fill="#ffffff" />
    <rect x="108" y="143" width="24" height="3" rx="1.5" fill="#d1d1d6" />
    <text x="14" y="162" fontSize="9.5" fontWeight="700" fill="#152238">3 pubs near you</text>
    <text x="226" y="162" fontSize="8.5" fill="#6e6e73" textAnchor="end">Nearest first</text>
    </g>
    </g>
    </svg>
  );
}

function PubArt() {
  return (
    <svg className={s.art} viewBox="0 0 240 180" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Walking up to the pub just before kick-off, with the game live on screen">
    <defs>
    <clipPath id="ssStepsPubClip"><rect x="0" y="0" width="240" height="180" rx="14" /></clipPath>
    <mask id="ssStepsRouteMask"><line className={`${s.a} ${s.route}`} x1="0" y1="172" x2="124" y2="172" stroke="#ffffff" strokeWidth="8" strokeDasharray="124" style={{ strokeDashoffset: 0 }} /></mask>
    </defs>
    <g clipPath="url(#ssStepsPubClip)">
    <rect x="0" y="0" width="240" height="180" fill="#fff4ea" />
    <rect x="0" y="168" width="240" height="12" fill="#f3e3d4" />
    <rect x="40" y="36" width="160" height="12" rx="3" fill="#0d1527" />
    <rect x="46" y="46" width="148" height="122" rx="4" fill="#152238" />
    <rect x="64" y="56" width="112" height="20" rx="4" fill="#0d1527" stroke="#e8732a" strokeOpacity=".7" />
    <text x="120" y="70" fontSize="8.5" fontWeight="800" letterSpacing="1.4" fill="#e8732a" textAnchor="middle">THE KINGS ARMS</text>
    <rect x="58" y="86" width="44" height="40" rx="4" fill="#fde9d6" />
    <rect x="62" y="90" width="36" height="24" rx="2" fill="#1f7a4d" />
    <line x1="80" y1="90" x2="80" y2="114" stroke="#ffffff" strokeOpacity=".6" />
    <circle cx="80" cy="102" r="5" fill="none" stroke="#ffffff" strokeOpacity=".6" />
    <circle className={s.tv} cx="69" cy="104" r="1.8" fill="#ffffff" />
    <g className={`${s.a} ${s.live}`} style={{ opacity: 1 }}><rect x="62" y="116" width="22" height="8" rx="2" fill="#e8732a" /><text x="73" y="122.4" fontSize="6" fontWeight="800" fill="#152238" textAnchor="middle">LIVE</text></g>
    <rect x="138" y="86" width="44" height="40" rx="4" fill="#fde9d6" />
    <line x1="160" y1="86" x2="160" y2="126" stroke="#152238" strokeWidth="2" />
    <line x1="138" y1="106" x2="182" y2="106" stroke="#152238" strokeWidth="2" />
    <rect x="108" y="120" width="24" height="48" rx="3" fill="#0d1527" />
    <g className={`${s.a} ${s.door}`} style={{ opacity: 1 }}>
    <rect x="108" y="120" width="24" height="48" rx="3" fill="#e8732a" />
    <ellipse cx="120" cy="172" rx="30" ry="5" fill="#e8732a" fillOpacity=".25" />
    </g>
    <line x1="0" y1="172" x2="124" y2="172" stroke="#e8732a" strokeWidth="2.5" strokeDasharray="4 5" strokeLinecap="round" mask="url(#ssStepsRouteMask)" />
    <circle className={`${s.a} ${s.walk}`} cx="8" cy="172" r="5" fill="#e8732a" stroke="#ffffff" strokeWidth="2" style={{ opacity: 0 }} />
    <g className={`${s.a} ${s.kickoff}`} style={{ opacity: 1, transformBox: "fill-box", transformOrigin: "center" }}>
    <rect x="150" y="10" width="78" height="22" rx="11" fill="#ffffff" stroke="#000" strokeOpacity=".08" />
    <circle cx="162" cy="21" r="3" fill="#e8732a" />
    <text x="194" y="24.5" fontSize="9.5" fontWeight="800" fill="#152238" textAnchor="middle">KO 17:30</text>
    </g>
    </g>
    </svg>
  );
}
