// Cloudflare Pages Function - POST /api/lead
// Verifies Turnstile, rejects honeypot hits, sends the lead by email via Resend.
//
// Required environment variables (set in Cloudflare Pages > Settings > Environment variables):
//   TURNSTILE_SECRET_KEY  - from the Cloudflare Turnstile dashboard
//   RESEND_API_KEY        - from https://resend.com (free tier)
//   LEAD_TO_EMAIL         - where leads are delivered
//   LEAD_FROM_EMAIL       - verified sender on your Resend domain

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }

  const { name, phone, email, message, company, city, intent, turnstileToken } = body;

  // Honeypot: real users never fill this field.
  if (company) {
    return jsonResponse({ ok: true }); // pretend success, don't tip off the bot
  }

  if (!name || !phone || !email) {
    return jsonResponse({ ok: false, error: 'missing_fields' }, 400);
  }

  if (env.TURNSTILE_SECRET_KEY) {
    const verified = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, request);
    if (!verified) {
      return jsonResponse({ ok: false, error: 'turnstile_failed' }, 403);
    }
  }

  const subject = `New lead - ${intent || 'general'} - ${city || 'unknown city'}`;
  const text = [
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `City: ${city || 'n/a'}`,
    `Intent: ${intent || 'n/a'}`,
    '',
    'Message:',
    message || '(no message)',
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.LEAD_FROM_EMAIL,
        to: env.LEAD_TO_EMAIL,
        reply_to: email,
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Resend error', res.status, detail);
      return jsonResponse({ ok: false, error: 'email_failed' }, 502);
    }
  } catch (err) {
    console.error('Resend request failed', err);
    return jsonResponse({ ok: false, error: 'email_failed' }, 502);
  }

  return jsonResponse({ ok: true });
}

async function verifyTurnstile(token, secret, request) {
  if (!token) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  return data.success === true;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
