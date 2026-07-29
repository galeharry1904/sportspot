// Single source of truth for "which season are we showing" — update this
// one value when the season rolls over rather than hunting through pages.
export const CURRENT_SEASON = '2025'
export const CURRENT_SEASON_LABEL = `${CURRENT_SEASON}–${String(Number(CURRENT_SEASON) + 1).slice(-2)}` // e.g. "2025–26"
