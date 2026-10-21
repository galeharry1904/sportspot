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

// Women's Super League from ESPN's public scoreboard.
//
// Why ESPN and not the APIs used above: football-data.org's catalogue has no
// women's competitions at all, and API-Football lists the WSL but blocks the
// current season on the free plan ("try from 2022 to 2024"). ESPN's scoreboard
// is undocumented but open, needs no key, and carries the live season.
//
// Two quirks worth keeping in mind:
//  - It 403s with "Access Denied" unless a browser-ish User-Agent is sent.
//    From Deno/edge with no UA you get HTML, not JSON.
//  - It rejects date *ranges* (400); only single ?dates=YYYYMMDD works, so we
//    walk the window a day at a time. That's ~8 unauthenticated calls a run.
const WSL = {
  name: "Women's Super League",
  // WSL is shared between Sky Sports and the BBC in the UK. ESPN reports US
  // broadcasters (Paramount+), so that field is deliberately ignored.
  broadcaster: 'Sky Sports / BBC',
  espnLeague: 'eng.w.1',
}

const ESPN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Accept': 'application/json',
}

function eachDate(from, to) {
  const days = []
  const cursor = new Date(from + 'T00:00:00Z')
  const end = new Date(to + 'T00:00:00Z')
  while (cursor <= end) {
    days.push(cursor.toISOString().split('T')[0].replace(/-/g, ''))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

async function syncWSL(from, to) {
  let total = 0
  const seen = new Set()

  for (const day of eachDate(from, to)) {
    try {
      const res = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/soccer/' + WSL.espnLeague + '/scoreboard?dates=' + day,
        { headers: ESPN_HEADERS }
      )
      if (!res.ok) {
        console.error(WSL.name + ' ' + day + ': HTTP ' + res.status)
        continue
      }
      const data = await res.json()
      const events = data.events || []

      for (const event of events) {
        // The same fixture can surface under neighbouring days depending on
        // how ESPN buckets kick-offs by timezone — upsert handles it, but
        // skipping avoids pointless writes.
        if (seen.has(event.id)) continue
        seen.add(event.id)

        const competition = (event.competitions || [])[0]
        const competitors = (competition && competition.competitors) || []
        const home = competitors.find(function(c) { return c.homeAway === 'home' })
        const away = competitors.find(function(c) { return c.homeAway === 'away' })
        if (!home || !away) {
          console.warn(WSL.name + ': skipping ' + event.id + ' — missing competitor')
          continue
        }

        // 'pre' | 'in' | 'post'. Only a completed match has meaningful scores;
        // ESPN reports 0-0 for anything not yet played, which would otherwise
        // look like a real goalless result.
        const state = event.status && event.status.type && event.status.type.state
        const finished = state === 'post'

        const kickoff = new Date(event.date).toISOString()
        const row = {
          home_team:      home.team.displayName,
          away_team:      away.team.displayName,
          competition:    WSL.name,
          sport:          'football',
          kickoff_time:   kickoff,
          fixture_date:   kickoff.split('T')[0],
          broadcaster:    WSL.broadcaster,
          api_fixture_id: 'espn-' + event.id,
          status:         finished ? 'FINISHED' : 'SCHEDULED',
          home_score:     finished ? Number(home.score) : null,
          away_score:     finished ? Number(away.score) : null,
        }

        const result = await supabase
          .from('fixtures')
          .upsert(row, { onConflict: 'api_fixture_id' })
        if (result.error) {
          console.error(WSL.name + ' insert error:', result.error.message)
        } else {
          total++
        }
      }
    } catch (e) {
      console.error(WSL.name + ' ' + day + ' failed:', e)
    }
  }

  console.log(WSL.name + ': ' + total + ' fixtures synced')
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
  const wsl = await syncWSL(from, to)
  const other = await syncOtherSports(from, to)

  return new Response(
    JSON.stringify({ success: true, football: football, wsl: wsl, other: other, total: football + wsl + other }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})