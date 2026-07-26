import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)
Deno.serve(async () => {
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
    // Build email content
    const matchList = matches.map(s => {
      const time = new Date(s.fixtures.kickoff_time).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})
      return `<li style="margin-bottom:8px"><strong>${s.fixtures.home_team} vs ${s.fixtures.away_team}</strong> · ${time} · ${s.pubs.name}</li>`
    }).join('')
    const html = `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
        <img src="https://sportspot.vercel.app/SportSpot Logo Updated.png" style="height:48px;margin-bottom:24px"/>
        <h1 style="font-size:22px;margin-bottom:8px">Your teams are showing today ⭐</h1>
        <p style="color:#6b7280;margin-bottom:20px">These pubs are confirmed showing your favourite teams today:</p>
        <ul style="padding-left:20px">${matchList}</ul>
        <a href="https://sportspot.vercel.app/map" style="display:inline-block;margin-top:24px;background:#e8732a;color:white;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none">Open Fan Map →</a>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">You're receiving this because you enabled notifications on SportSpot. <a href="https://sportspot.vercel.app/fan/profile">Update preferences</a></p>
      </div>
    `
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SportSpot <onboarding@resend.dev>',
        to: profile.auth_user?.email,
        subject: 'Your teams are showing today ⭐',
        html
      })
    })
    sent++
  }
  return new Response(JSON.stringify({ success: true, sent }), {
    headers: { 'Content-Type': 'application/json' }
  })
})