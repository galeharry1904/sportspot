import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// football-data.org seasons run Aug-May and are keyed by their start year.
function currentFootballSeason() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  return month >= 8 ? year : year - 1
}

// Competitions football-data.org can produce a real league table for —
// cups and Champions/Europa League are knockout/group stage, no simple table.
const STANDINGS_COMPETITIONS = [
  { code: 'PL', name: 'Premier League' },
  { code: 'ELC', name: 'Championship' },
]

// Every football competition sync-fixtures tracks — used to backfill scores
// onto rows that function already created once those matches finish.
const FOOTBALL_COMPETITIONS = [
  { code: 'PL', name: 'Premier League' },
  { code: 'ELC', name: 'Championship' },
  { code: 'FA', name: 'FA Cup' },
  { code: 'LC', name: 'League Cup' },
  { code: 'CL', name: 'Champions League' },
  { code: 'EL', name: 'Europa League' },
  { code: 'WC', name: 'FIFA World Cup' },
  { code: 'EC', name: 'European Championship' },
]

async function syncStandings(season) {
  const key = Deno.env.get('FOOTBALL_DATA_KEY')
  let rows = 0
  for (const comp of STANDINGS_COMPETITIONS) {
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/competitions/${comp.code}/standings?season=${season}`,
        { headers: { 'X-Auth-Token': key } }
      )
      const data = await res.json()
      const table = data.standings?.find((s) => s.type === 'TOTAL')?.table
      if (!table) {
        console.log(`sync-results-and-standings: no standings table for ${comp.name}`)
        continue
      }
      for (const row of table) {
        const record = {
          competition: comp.name,
          season: String(season),
          team: row.team.name,
          position: row.position,
          played: row.playedGames,
          won: row.won,
          drawn: row.draw,
          lost: row.lost,
          goals_for: row.goalsFor,
          goals_against: row.goalsAgainst,
          goal_difference: row.goalDifference,
          points: row.points,
          updated_at: new Date().toISOString(),
        }
        const { error } = await supabase
          .from('standings')
          .upsert(record, { onConflict: 'competition,season,team' })
        if (error) console.error(`sync-results-and-standings: ${comp.name} standings upsert failed`, error.message)
        else rows++
      }
    } catch (err) {
      console.error(`sync-results-and-standings: ${comp.name} standings fetch failed`, err)
    }
  }
  return rows
}

async function syncResults(season) {
  const key = Deno.env.get('FOOTBALL_DATA_KEY')
  let updated = 0
  for (const comp of FOOTBALL_COMPETITIONS) {
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/competitions/${comp.code}/matches?season=${season}&status=FINISHED`,
        { headers: { 'X-Auth-Token': key } }
      )
      const data = await res.json()
      if (!data.matches) {
        console.log(`sync-results-and-standings: no finished matches for ${comp.name}`)
        continue
      }
      for (const match of data.matches) {
        const { error } = await supabase
          .from('fixtures')
          .update({
            home_score: match.score?.fullTime?.home ?? null,
            away_score: match.score?.fullTime?.away ?? null,
            status: 'FINISHED',
          })
          .eq('api_fixture_id', 'fd-' + match.id)
        if (error) console.error(`sync-results-and-standings: ${comp.name} result update failed`, error.message)
        else updated++
      }
    } catch (err) {
      console.error(`sync-results-and-standings: ${comp.name} results fetch failed`, err)
    }
  }
  return updated
}

Deno.serve(async () => {
  const season = currentFootballSeason()
  const standingsRows = await syncStandings(season)
  const resultsUpdated = await syncResults(season)
  const summary = { success: true, season, standingsRows, resultsUpdated }
  console.log('sync-results-and-standings: run complete', summary)
  return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } })
})
