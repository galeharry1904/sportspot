import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// TODO: swap this for your real production URL once the site is deployed
// somewhere reachable — it is where Supabase sends the manager after it
// verifies their one-click login token. Pointed at localhost for now
// since the app is only running locally; the link will only work while
// `npm run dev` is running on the machine that opens the email.
const SITE_URL = 'http://localhost:3000'
const DASHBOARD_PATH = '/dashboard'
const LOGO_URL = 'https://prlrakhymwfuffazjtxm.supabase.co/storage/v1/object/public/assets/SportSpot-Logo-Light.png'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// The cron schedule that triggers this function fires every hour — Postgres's
// cron.timezone on this project is pinned to fixed-offset GMT with no DST
// awareness, so a single daily UTC time can't reliably mean "9am UK time"
// year-round. Deno's own Intl/timezone database does handle BST/GMT
// correctly, so the function checks the real London wall-clock time itself
// and no-ops outside the 9am hour, rather than relying on Postgres to only
// invoke it once at the right moment.
function isNineAmInLondon() {
  const londonHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hourCycle: 'h23',
      hour: '2-digit',
    }).format(new Date())
  )
  return londonHour === 9
}

function formatKickoff(kickoffTime) {
  return new Date(kickoffTime).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  })
}

function broadcasterColor(broadcaster) {
  if (!broadcaster) return '#e8732a'
  if (/sky/i.test(broadcaster)) return '#0ea5e9'
  if (/tnt/i.test(broadcaster)) return '#a855f7'
  return '#6e6e73'
}

function broadcasterBadge(broadcaster) {
  if (!broadcaster) return ''
  const label = escapeHtml(broadcaster)
  const color = broadcasterColor(broadcaster)
  return `
      <span style="display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.3px;color:${color};background-color:${color}14;border:1px solid ${color}35;border-radius:6px;padding:3px 9px;">
        ${label}
      </span>`
}

function fixtureCard(fixture) {
  const time = formatKickoff(fixture.kickoff_time)
  const home = escapeHtml(fixture.home_team)
  const away = escapeHtml(fixture.away_team)
  const competition = escapeHtml(fixture.competition)
  const accent = broadcasterColor(fixture.broadcaster)
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
    <tr>
      <td width="3" style="background-color:${accent};border-radius:3px 0 0 3px;"></td>
      <td style="background-color:#ffffff;border:1px solid rgba(0,0,0,0.07);border-left:none;border-radius:0 10px 10px 0;padding:15px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:10px;font-weight:700;letter-spacing:0.9px;text-transform:uppercase;color:#e8732a;">
              ${competition}
            </td>
            <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:700;color:#6e6e73;white-space:nowrap;">
              ${time}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">
          <tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;font-weight:700;color:#152238;line-height:1.4;">
              ${home} <span style="color:#aeaeb2;font-weight:500;">vs</span> ${away}
            </td>
            <td align="right" style="white-space:nowrap;">
              ${broadcasterBadge(fixture.broadcaster)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

function buildEmailHtml({ pubName, fixtures, magicLink }) {
  const cards = fixtures.map(fixtureCard).join('')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>Today's fixtures — SportSpot</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f5f5f7;">
    ${fixtures.length} fixture${fixtures.length !== 1 ? 's' : ''} today for ${escapeHtml(pubName)} — confirm your lineup on SportSpot.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="${LOGO_URL}" alt="SportSpot" height="36" style="height:36px;width:auto;display:block;border:0;"/>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid rgba(0,0,0,0.06);border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.05);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="line-height:0;font-size:0;">
                    <div style="height:3px;background-color:#e8732a;background-image:linear-gradient(90deg,#e8732a,#ffb27a);"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:38px 36px 0;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#e8732a;margin-bottom:14px;">
                      Good morning
                    </div>
                    <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:26px;font-weight:800;color:#152238;letter-spacing:-0.5px;line-height:1.3;margin:0 0 10px;">
                      ${escapeHtml(pubName)}, here's today's sport.
                    </h1>
                    <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#6e6e73;line-height:1.6;margin:0 0 26px;">
                      ${fixtures.length} fixture${fixtures.length !== 1 ? 's' : ''} kicking off today. Confirm which ones you're showing so fans can find you on the map.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 36px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius:10px;background-color:#e8732a;">
                          <a href="${magicLink}" style="display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;">
                            Manage Today's Fixtures →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-style:italic;color:#aeaeb2;margin:10px 0 0;">
                      This link signs you in automatically, no password needed, and expires in 24 hours.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 0 36px;">
                    <div style="height:1px;background-color:rgba(0,0,0,0.06);margin-bottom:24px;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 36px 36px;background-color:#fafafa;">
                    ${cards}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 16px 0;">
              <img src="${LOGO_URL}" alt="SportSpot" height="18" style="height:18px;width:auto;display:block;margin:0 auto 14px;opacity:0.6;"/>
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#aeaeb2;line-height:1.7;margin:0;">
                You're receiving this because your venue is registered on SportSpot.<br/>
                This is a daily operational email for pub managers, sent each match morning.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

Deno.serve(async () => {
  if (!isNineAmInLondon()) {
    return new Response(JSON.stringify({ success: true, skipped: true, reason: 'not 9am London time' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const today = new Date().toISOString().split('T')[0]
  const resendKey = Deno.env.get('RESEND_KEY')

  // Today's fixtures — the same list managers see on their dashboard.
  const { data: fixtures, error: fixturesError } = await supabase
    .from('fixtures')
    .select('*')
    .eq('fixture_date', today)
    .order('kickoff_time')

  if (fixturesError) {
    console.error('notify-pubs: failed to load fixtures', fixturesError)
    return new Response(JSON.stringify({ success: false, error: fixturesError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!fixtures?.length) {
    console.log('notify-pubs: no fixtures today, skipping send')
    return new Response(JSON.stringify({ success: true, sent: 0, reason: 'no fixtures today' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: pubs, error: pubsError } = await supabase
    .from('pubs')
    .select('*')
    .not('owner_id', 'is', null)

  if (pubsError) {
    console.error('notify-pubs: failed to load pubs', pubsError)
    return new Response(JSON.stringify({ success: false, error: pubsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const pub of pubs ?? []) {
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(pub.owner_id)
      const ownerEmail = userData?.user?.email

      if (userError || !ownerEmail) {
        console.warn(`notify-pubs: skipping "${pub.name}" (${pub.id}) — no owner email`, userError)
        skipped++
        continue
      }

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: ownerEmail,
        options: { redirectTo: `${SITE_URL}${DASHBOARD_PATH}` },
      })

      if (linkError || !linkData?.properties?.action_link) {
        console.error(`notify-pubs: failed to generate magic link for "${pub.name}" (${pub.id})`, linkError)
        failed++
        continue
      }

      const html = buildEmailHtml({
        pubName: pub.name || 'there',
        fixtures,
        magicLink: linkData.properties.action_link,
      })

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + resendKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'SportSpot <onboarding@resend.dev>',
          to: ownerEmail,
          subject: `${fixtures.length} fixture${fixtures.length !== 1 ? 's' : ''} today — confirm your lineup`,
          html,
        }),
      })

      if (!resendRes.ok) {
        const body = await resendRes.text()
        console.error(`notify-pubs: Resend send failed for "${pub.name}" (${pub.id})`, resendRes.status, body)
        failed++
        continue
      }

      console.log(`notify-pubs: sent to "${pub.name}" (${pub.id}) <${ownerEmail}>`)
      sent++
    } catch (err) {
      console.error(`notify-pubs: unexpected error for pub ${pub.id}`, err)
      failed++
    }
  }

  const summary = { success: true, fixturesToday: fixtures.length, pubsConsidered: pubs?.length ?? 0, sent, skipped, failed }
  console.log('notify-pubs: run complete', summary)

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  })
})
