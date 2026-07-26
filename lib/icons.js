// Shared icon set — Lucide for general UI, hand-drawn minimal line icons
// (matching Lucide's stroke conventions) for the sports Lucide doesn't cover.
export {
  User,
  ClipboardList,
  MapPin,
  Beer,
  CheckCircle2,
  Tv,
  Clock,
  TrendingUp,
  Star,
  X,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Award,
  Menu,
  Bell,
} from 'lucide-react'

function IconBase({ size = 18, strokeWidth = 2, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function FootballIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l3.2 2.3-1.2 3.8h-4l-1.2-3.8z" />
      <path d="M12 7.5V5M15.2 9.8l2.6-1.3M13.9 13.6l1.6 2.8M10.1 13.6l-1.6 2.8M8.8 9.8L6.2 8.5" />
    </IconBase>
  )
}

export function RugbyIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <path d="M4.5 12h15" />
      <path d="M9.5 10v4M14.5 10v4" />
    </IconBase>
  )
}

export function CricketIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 21h16" />
      <path d="M8 21V8M12 21V8M16 21V8" />
      <path d="M7 8h4M13 8h4" />
    </IconBase>
  )
}

export function TennisIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.3 5.3c3 3 3 10.4 0 13.4M18.7 5.3c-3 3-3 10.4 0 13.4" />
    </IconBase>
  )
}

export function F1Icon(props) {
  return (
    <IconBase {...props}>
      <path d="M5 21V4" />
      <path d="M5 4h12v7H5z" />
      <path d="M5 7.5h12M9 4v7M13 4v7" />
    </IconBase>
  )
}

const SPORT_ICON_COMPONENTS = {
  football: FootballIcon,
  rugby: RugbyIcon,
  cricket: CricketIcon,
  tennis: TennisIcon,
  f1: F1Icon,
}

export function SportIcon({ sport, size = 16, ...props }) {
  const Icon = SPORT_ICON_COMPONENTS[sport?.toLowerCase()] || Tv
  return <Icon size={size} {...props} />
}

function svgDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// Flat, filled glyphs for use as Google Maps AdvancedMarker/Pin `glyphSrc` —
// that prop takes a URL, not a React element, so these are rendered to a
// data URI directly using the same path data as the Lucide icons above.
export const PIN_STAR_GLYPH = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>`
)

export const PIN_TV_GLYPH = svgDataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2-5 5-5-5"/><rect width="20" height="15" x="2" y="7" rx="2"/></svg>`
)
