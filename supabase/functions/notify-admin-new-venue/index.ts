import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// TODO: swap this for your real production URL once the site is deployed
// somewhere reachable — see the same TODO in notify-pubs/index.ts.
const SITE_URL = 'http://localhost:3000'
const ADMIN_PATH = '/admin'
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

function detailRow(label, value) {
  if (!value) return ''
  return `
  <tr>
    <td style="padding:6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;color:#aeaeb2;width:140px;vertical-align:top;">
      ${escapeHtml(label)}
    </td>
    <td style="padding:6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#152238;">
      ${escapeHtml(value)}
    </td>
  </tr>`
}

function buildEmailHtml(pub) {
  const rows = [
    detailRow('Venue name', pub.name),
    detailRow('Address', pub.address),
    detailRow('Phone', pub.phone),
    detailRow('Contact email', pub.contact_email),
    detailRow('Submitted by', pub.submitter_name),
    detailRow('Their position', pub.submitter_position),
  ].join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>New venue application — SportSpot</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f5f5f7;">
    ${escapeHtml(pub.name || 'A new venue')} just applied to join SportSpot — review it in the admin panel.
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
                      New application
                    </div>
                    <h1 style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:24px;font-weight:800;color:#152238;letter-spacing:-0.5px;line-height:1.3;margin:0 0 20px;">
                      ${escapeHtml(pub.name || 'A venue')} wants to join SportSpot
                    </h1>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
                      ${rows}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 36px 36px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius:10px;background-color:#e8732a;">
                          <a href="${SITE_URL}${ADMIN_PATH}" style="display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;">
                            Review in admin panel →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 16px 0;">
              <img src="${LOGO_URL}" alt="SportSpot" height="18" style="height:18px;width:auto;display:block;margin:0 auto 14px;opacity:0.6;"/>
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#aeaeb2;line-height:1.7;margin:0;">
                You're receiving this because you're an admin on SportSpot.
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
  const resendKey = Deno.env.get('RESEND_KEY')

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

  const { data: pub, error: pubError } = await supabase.from('pubs').select('*').eq('id', pubId).single()
  if (pubError || !pub) {
    console.error('notify-admin-new-venue: pub not found', pubId, pubError)
    return new Response(JSON.stringify({ success: false, error: 'pub not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: admins, error: adminsError } = await supabase.from('admins').select('user_id')
  if (adminsError) {
    console.error('notify-admin-new-venue: failed to load admins', adminsError)
    return new Response(JSON.stringify({ success: false, error: adminsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!admins?.length) {
    console.log('notify-admin-new-venue: no admins registered, skipping send')
    return new Response(JSON.stringify({ success: true, sent: 0, reason: 'no admins registered' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const adminEmails = []
  for (const admin of admins) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(admin.user_id)
    if (!userError && userData?.user?.email) adminEmails.push(userData.user.email)
  }

  if (!adminEmails.length) {
    console.warn('notify-admin-new-venue: no resolvable admin emails')
    return new Response(JSON.stringify({ success: true, sent: 0, reason: 'no resolvable admin emails' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + resendKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SportSpot <onboarding@resend.dev>',
      to: adminEmails,
      subject: `New venue application — ${pub.name || 'unnamed venue'}`,
      html: buildEmailHtml(pub),
    }),
  })

  if (!resendRes.ok) {
    const body = await resendRes.text()
    console.error('notify-admin-new-venue: Resend send failed', resendRes.status, body)
    return new Response(JSON.stringify({ success: false, error: body }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`notify-admin-new-venue: sent to ${adminEmails.length} admin(s) for "${pub.name}" (${pub.id})`)
  return new Response(JSON.stringify({ success: true, sent: adminEmails.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
