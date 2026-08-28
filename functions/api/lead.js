// Cloudflare Pages Function - POST /api/lead
// Security layers (adapted from the PHP /gen-lead-site skill):
//   1. POST only (this handler only responds to onRequestPost)
//   2. Turnstile challenge (equivalent to CSRF)
//   3. Honeypot on `company` field
//   4. Whitelist enum values for `intent` and `city`
//   5. Rate limiting per IP: max 5 submissions per hour, via KV binding LEAD_RATE_KV
//   6. Basic sanitization on free-text fields
//
// Required environment variables (Cloudflare Pages > Settings > Environment variables):
//   TURNSTILE_SECRET_KEY  - from the Cloudflare Turnstile dashboard
//   RESEND_API_KEY        - from https://resend.com (free tier)
//   LEAD_TO_EMAIL         - where leads are delivered
//   LEAD_FROM_EMAIL       - verified sender on your Resend domain
//
// Optional bindings:
//   LEAD_RATE_KV          - KV namespace binding used for IP rate limiting.
//                           If not bound, rate limiting is skipped (best effort).

import intents from '../../src/data/intents.json';
import cities from '../../src/data/cities.json';

const ALLOWED_INTENT_SLUGS = new Set(intents.map((i) => i.slug));
const ALLOWED_INTENT_LABELS = new Set(intents.map((i) => i.label));
const ALLOWED_CITY_SLUGS = new Set(cities.map((c) => c.slug));
const ALLOWED_CITY_NAMES = new Set(cities.map((c) => c.name));

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }

  const { name, phone, email, message, company, city, intent, turnstileToken } = body;

  // 3. Honeypot: real users never fill this field.
  if (company) {
    return jsonResponse({ ok: true });
  }

  // Basic presence check
  if (!name || !phone || !email) {
    return jsonResponse({ ok: false, error: 'missing_fields' }, 400);
  }

  // 6. Sanitize free-text: cap length, strip HTML tags
  const cleanName = sanitizeText(name, 120);
  const cleanPhone = sanitizeText(phone, 40);
  const cleanEmail = sanitizeText(email, 200);
  const cleanMessage = sanitizeText(message ?? '', 2000);

  if (!isValidEmail(cleanEmail)) {
    return jsonResponse({ ok: false, error: 'invalid_email' }, 400);
  }

  // 4. Whitelist enum: intent and city can be passed as slug OR display name
  // by the client, accept either but drop unknown values instead of failing.
  const safeIntent = normalizeEnum(intent, ALLOWED_INTENT_SLUGS, ALLOWED_INTENT_LABELS);
  const safeCity = normalizeEnum(city, ALLOWED_CITY_SLUGS, ALLOWED_CITY_NAMES);

  // 2. Turnstile
  if (env.TURNSTILE_SECRET_KEY) {
    const verified = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, request);
    if (!verified) {
      return jsonResponse({ ok: false, error: 'turnstile_failed' }, 403);
    }
  }

  // 5. Rate limit per IP (best effort - only enforced when LEAD_RATE_KV is bound)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (env.LEAD_RATE_KV) {
    const key = `rl:${ip}`;
    const raw = await env.LEAD_RATE_KV.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= RATE_LIMIT_MAX) {
      return jsonResponse({ ok: false, error: 'rate_limited' }, 429);
    }
    await env.LEAD_RATE_KV.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW_SECONDS });
  }

  const subject = `New lead - ${safeIntent || 'general'} - ${safeCity || 'unknown city'}`;
  const text = [
    `Name: ${cleanName}`,
    `Phone: ${cleanPhone}`,
    `Email: ${cleanEmail}`,
    `City: ${safeCity || 'n/a'}`,
    `Intent: ${safeIntent || 'n/a'}`,
    `IP: ${ip}`,
    '',
    'Message:',
    cleanMessage || '(no message)',
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
        reply_to: cleanEmail,
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

// Non-POST requests get a 405 so /api/lead never leaks anything to a GET.
export async function onRequest({ request }) {
  if (request.method === 'POST') return; // let onRequestPost handle it
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST', 'Content-Type': 'text/plain' },
  });
}

function sanitizeText(value, maxLen) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEnum(value, slugSet, labelSet) {
  if (!value) return '';
  const s = String(value).trim();
  if (slugSet.has(s)) return s;
  if (labelSet.has(s)) return s;
  return '';
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
