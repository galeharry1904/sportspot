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

// Map pin marker matching the logo's mark: a rounded teardrop with a
// solid dot at its center. Used as AdvancedMarker children (in place of
// the library's default <Pin>) so the map's location markers are the same
// shape as the SportSpot logo, not Google's generic pin.
const PIN_STAR_PATH = 'M12,5.4 L12.88,7.79 L15.42,7.89 L13.43,9.46 L14.12,11.91 L12,10.5 L9.88,11.91 L10.57,9.46 L8.58,7.89 L11.12,7.79 Z'

export function PubPin({ variant = 'default' }) {
  const variants = {
    default: { body: '#e8732a', dot: '#152238', size: 30 },
    selected: { body: '#e8732a', dot: '#152238', size: 38 },
    favourite: { body: '#22c55e', dot: '#ffffff', size: 32 },
  }
  const { body, dot, size } = variants[variant] || variants.default
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}
    >
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill={body}
        stroke="white"
        strokeWidth="1"
      />
      {variant === 'favourite'
        ? <path d={PIN_STAR_PATH} fill={dot}/>
        : <circle cx="12" cy="9" r="3.3" fill={dot} />}
    </svg>
  )
}
