import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)

function getDateRange() {
  const today = new Date()
  const nextWeek = new Date()
  nextWeek.setDate(today.getDate() + 7)
  const fmt = (d) => d.toISOString().split('T')[0]
  return { from: fmt(today), to: fmt(nextWeek) }
}

// Football competitions from football-data.org
const FOOTBALL_COMPETITIONS = [
  { code: 'PL',  name: 'Premier League',           broadcaster: 'Sky Sports' },
  { code: 'ELC', name: 'Championship',              broadcaster: 'Sky Sports' },
  { code: 'FA',  name: 'FA Cup',                    broadcaster: 'BBC / ITV' },
  { code: 'LC',  name: 'League Cup',                broadcaster: 'Sky Sports' },
  { code: 'CL',  name: 'Champions League',          broadcaster: 'TNT Sports' },
  { code: 'EL',  name: 'Europa League',             broadcaster: 'TNT Sports' },
  { code: 'WC',  name: 'FIFA World Cup',            broadcaster: 'ITV / BBC' },
  { code: 'EC',  name: 'European Championship',     broadcaster: 'ITV / BBC' },
]

async function syncFootball(from, to) {
  const key = Deno.env.get('FOOTBALL_DATA_KEY')
  let total = 0

  for (const comp of FOOTBALL_COMPETITIONS) {
    try {
      const res = await fetch(
        'https://api.football-data.org/v4/competitions/' + comp.code + '/matches?dateFrom=' + from + '&dateTo=' + to,
        { headers: { 'X-Auth-Token': key } }
      )
      const data = await res.json()
      if (!data.matches) {
        console.log(comp.name + ': no matches returned')
        continue
      }

      console.log(comp.name + ': ' + data.matches.length + ' matches')

      for (const match of data.matches) {
        const row = {
          home_team:      match.homeTeam.name,
          away_team:      match.awayTeam.name,
          competition:    comp.name,
          sport:          'football',
          kickoff_time:   match.utcDate,
          fixture_date:   match.utcDate.split('T')[0],
          broadcaster:    comp.broadcaster,
          api_fixture_id: 'fd-' + match.id,
        }
        const result = await supabase
          .from('fixtures')
          .upsert(row, { onConflict: 'api_fixture_id' })
        if (result.error) {
          console.error('Insert error:', result.error.message)
        } else {
          total++
        }
      }
    } catch (e) {
      console.error(comp.name + ' failed:', e)
    }
  }
  return total
}

// Other sports from TheSportsDB
const OTHER_LEAGUES = [
  { id: '4391', name: 'Premiership Rugby',        sport: 'rugby',    broadcaster: 'TNT Sports' },
  { id: '4674', name: 'Six Nations',              sport: 'rugby',    broadcaster: 'ITV / BBC' },
  { id: '4452', name: 'Cricket - Test',           sport: 'cricket',  broadcaster: 'Sky Sports' },
  { id: '4370', name: 'Formula 1',                sport: 'f1',       broadcaster: 'Sky Sports F1' },
]

async function syncOtherSports(from, to) {
  let total = 0

  for (const league of OTHER_LEAGUES) {
    try {
      const res = await fetch(
        'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=' + league.id
      )
      const data = await res.json()
      if (!data.events) {
        console.log('No events for ' + league.name)
        continue
      }

      const filtered = data.events.filter(function(e) {
        if (!e.dateEvent) return false
        return e.dateEvent >= from && e.dateEvent <= to
      })

      console.log(league.name + ': ' + filtered.length + ' events in range')

      for (const event of filtered) {
        const kickoff = event.strTime
          ? event.dateEvent + 'T' + event.strTime + 'Z'
          : event.dateEvent + 'T12:00:00Z'

        const row = {
          home_team:      event.strHomeTeam || event.strEvent,
          away_team:      event.strAwayTeam || 'TBC',
          competition:    league.name,
          sport:          league.sport,
          kickoff_time:   kickoff,
          fixture_date:   event.dateEvent,
          broadcaster:    league.broadcaster,
          api_fixture_id: 'sportsdb-' + event.idEvent,
        }
        const result = await supabase
          .from('fixtures')
          .upsert(row, { onConflict: 'api_fixture_id' })
        if (result.error) {
          console.error('Insert error:', result.error.message)
        } else {
          total++
        }
      }
    } catch (e) {
      console.error(league.name + ' failed:', e)
    }
  }
  return total
}

Deno.serve(async function() {
  const { from, to } = getDateRange()
  console.log('Syncing fixtures from ' + from + ' to ' + to)

  const football = await syncFootball(from, to)
  const other = await syncOtherSports(from, to)

  return new Response(
    JSON.stringify({ success: true, football: football, other: other, total: football + other }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})