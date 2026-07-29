// Shared between the full /leagues table and the home page preview so the
// two never disagree on what counts as a European or relegation spot.
// `total` should be the competition's real full size (e.g. 20 for the
// Premier League), not the number of rows currently on screen — a top-10
// preview still needs to know relegation is 20 places away, not 10.
export function standingsRowAccent(competition, position, total) {
  if (competition === 'Premier League') {
    if (position <= 4) return '#0ea5e9'
    if (position > total - 3) return '#dc2626'
  }
  if (competition === 'Championship') {
    if (position <= 2) return '#22c55e'
    if (position <= 6) return '#e8732a'
    if (position > total - 3) return '#dc2626'
  }
  return 'transparent'
}

export const COMPETITION_SIZE = {
  'Premier League': 20,
  'Championship': 24,
}
