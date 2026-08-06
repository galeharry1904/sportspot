import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// TODO: swap this for your real production URL once the site is deployed
// somewhere reachable — see the same TODO in notify-pubs/index.ts.
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

function buildEmailHtml({ pubName, magicLink }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>You're approved — SportSpot</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f5f5f7;">
    ${escapeHtml(pubName)} has been approved on SportSpot — head to your dashboard to get started.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="${LOGO_URL}" alt="SportSpot" height="36" style="height:36px;width:auto;display:block;border:0;"/>
            </td>
          </tr>
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
                      You're approved
                    </div>
                    <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:26px;font-weight:800;color:#152238;letter-spacing:-0.5px;line-height:1.3;margin:0 0 10px;">
                      Welcome to SportSpot, ${escapeHtml(pubName)}.
                    </h1>
                    <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;color:#6e6e73;line-height:1.6;margin:0 0 26px;">
                      Your venue application has been reviewed and approved. You're now live — head to your dashboard to confirm which fixtures you're showing so fans can find you on the map.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 36px 36px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius:10px;background-color:#e8732a;">
                          <a href="${magicLink}" style="display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;">
                            Go to your dashboard →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-style:italic;color:#aeaeb2;margin:10px 0 0;">
                      This link signs you in automatically, no password needed, and expires in 24 hours.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 16px 0;">
              <img src="${LOGO_URL}" alt="SportSpot" height="18" style="height:18px;width:auto;display:block;margin:0 auto 14px;opacity:0.6;"/>
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#aeaeb2;line-height:1.7;margin:0;">
                You're receiving this because you applied to list a venue on SportSpot.
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

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') || ''
  const callerJwt = authHeader.replace(/^Bearer\s+/i, '')

  const { data: { user: caller }, error: callerError } = await supabase.auth.getUser(callerJwt)
  if (callerError || !caller) {
    return new Response(JSON.stringify({ success: false, error: 'not signed in' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: adminRow } = await supabase.from('admins').select('user_id').eq('user_id', caller.id).maybeSingle()
  if (!adminRow) {
    return new Response(JSON.stringify({ success: false, error: 'not an admin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let pubId
  try {
    const body = await req.json()
    pubId = body.pub_id
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'missing pub_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: pub, error: pubError } = await supabase.from('pubs').update({ status: 'approved' }).eq('id', pubId).select().single()
  if (pubError || !pub) {
    console.error('notify-venue-approved: failed to approve pub', pubId, pubError)
    return new Response(JSON.stringify({ success: false, error: pubError?.message || 'pub not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(pub.owner_id)
  const ownerEmail = userData?.user?.email

  if (userError || !ownerEmail) {
    console.warn(`notify-venue-approved: approved "${pub.name}" (${pub.id}) but no owner email — skipping email`, userError)
    return new Response(JSON.stringify({ success: true, approved: true, emailed: false }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: ownerEmail,
    options: { redirectTo: `${SITE_URL}${DASHBOARD_PATH}` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    console.error(`notify-venue-approved: failed to generate magic link for "${pub.name}" (${pub.id})`, linkError)
    return new Response(JSON.stringify({ success: true, approved: true, emailed: false, error: linkError?.message }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const resendKey = Deno.env.get('RESEND_KEY')
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + resendKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SportSpot <onboarding@resend.dev>',
      to: ownerEmail,
      subject: `You're approved — welcome to SportSpot, ${pub.name || 'there'}`,
      html: buildEmailHtml({ pubName: pub.name || 'there', magicLink: linkData.properties.action_link }),
    }),
  })

  if (!resendRes.ok) {
    const body = await resendRes.text()
    console.error(`notify-venue-approved: Resend send failed for "${pub.name}" (${pub.id})`, resendRes.status, body)
    return new Response(JSON.stringify({ success: true, approved: true, emailed: false, error: body }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`notify-venue-approved: approved and emailed "${pub.name}" (${pub.id}) <${ownerEmail}>`)
  return new Response(JSON.stringify({ success: true, approved: true, emailed: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
