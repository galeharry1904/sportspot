import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE_URL = 'https://sportspot-phi.vercel.app'
const LOGO_URL = 'https://sportspot-phi.vercel.app/New%20Logo.png'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// The cron schedule that triggers this function now fires every hour —
// Postgres's cron.timezone on this project is pinned to fixed-offset GMT
// with no DST awareness, so a single daily UTC time can't reliably mean
// "9am UK time" year-round. Deno's own Intl/timezone database does handle
// BST/GMT correctly, so the function checks the real London wall-clock
// time itself and no-ops outside the 9am hour.
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

function showingCard(showing) {
  const time = formatKickoff(showing.fixtures.kickoff_time)
  const home = escapeHtml(showing.fixtures.home_team)
  const away = escapeHtml(showing.fixtures.away_team)
  const pubName = escapeHtml(showing.pubs.name)
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
    <tr>
      <td width="3" style="background-color:#e8732a;border-radius:3px 0 0 3px;"></td>
      <td style="background-color:#ffffff;border:1px solid rgba(0,0,0,0.07);border-left:none;border-radius:0 10px 10px 0;padding:15px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;font-weight:700;color:#152238;line-height:1.4;">
              ${home} <span style="color:#aeaeb2;font-weight:500;">vs</span> ${away}
            </td>
            <td align="right" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:700;color:#6e6e73;white-space:nowrap;">
              ${time}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">
          <tr>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#6e6e73;">
              📍 ${pubName}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

function buildEmailHtml({ matches }) {
  const cards = matches.map(showingCard).join('')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>Your teams are on today — SportSpot</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f5f5f7;">
    ${matches.length} of your teams ${matches.length !== 1 ? 'are' : 'is'} on today — here's where to watch.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="${LOGO_URL}" alt="SportSpot" height="40" style="height:40px;width:auto;display:block;border:0;"/>
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
                      Your team${matches.length !== 1 ? 's are' : ' is'} on today.
                    </h1>
                    <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#6e6e73;line-height:1.6;margin:0 0 26px;">
                      These pubs are confirmed showing your favourite team${matches.length !== 1 ? 's' : ''} today.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 36px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius:10px;background-color:#e8732a;">
                          <a href="${SITE_URL}/map" style="display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;">
                            Open Fan Map →
                          </a>
                        </td>
                      </tr>
                    </table>
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
                You're receiving this because you enabled notifications on SportSpot.<br/>
                <a href="${SITE_URL}/fan/profile" style="color:#aeaeb2;">Update your preferences</a>
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
    return new Response(JSON.stringify({ success: true, skipped: true, reason: 'not 9am London time' }))
  }

  const today = new Date().toISOString().split('T')[0]
  const resendKey = Deno.env.get('RESEND_KEY')

  // Get today's confirmed showings with fixture and pub info
  const { data: showings } = await supabase
    .from('showings')
    .select('*, fixtures(*), pubs(*)')
    .eq('is_showing', true)
  const todayShowings = (showings || []).filter(s => s.fixtures?.fixture_date === today)
  if (!todayShowings.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no showings today' }))
  }

  // Get all fans who want notifications
  const { data: profiles } = await supabase
    .from('fan_profiles')
    .select('*, auth_user:user_id(email)')
    .eq('notify_email', true)

  let sent = 0
  for (const profile of (profiles || [])) {
    if (!profile.favourite_teams?.length) continue

    // Find showings that match this fan's favourite teams
    const matches = todayShowings.filter(s =>
      profile.favourite_teams.some(team =>
        s.fixtures?.home_team?.includes(team) || s.fixtures?.away_team?.includes(team)
      )
    )
    if (!matches.length) continue

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SportSpot <onboarding@resend.dev>',
        to: profile.auth_user?.email,
        subject: 'Your teams are showing today ⭐',
        html: buildEmailHtml({ matches }),
      })
    })
    sent++
  }
  return new Response(JSON.stringify({ success: true, sent }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
