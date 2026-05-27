const ALLOWED_ORIGINS = [
  'https://noxusstudios.com',
  'https://www.noxusstudios.com',
  'http://localhost:3000',
  'http://localhost:8888',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(payload, status, request) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request' }, 400, request);
  }

  const { name, email, service, budget, message } = body;

  if (!name || typeof name !== 'string' || name.length > 200) {
    return jsonResponse({ error: 'Name is required' }, 400, request);
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Valid email is required' }, 400, request);
  }
  if (body['bot-field']) {
    return jsonResponse({ ok: true }, 200, request);
  }

  const submission = {
    name: name.slice(0, 200),
    email: email.slice(0, 300),
    service: (service || '').slice(0, 200),
    budget: (budget || '').slice(0, 200),
    message: (message || '').slice(0, 5000),
    submitted_at: new Date().toISOString(),
  };

  console.log('CONTACT_SUBMISSION:', JSON.stringify(submission));

  if (env.RESEND_API_KEY) {
    try {
      const emailHtml = `
        <h2>New brief from ${submission.name}</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;">
          <tr><td style="padding:6px 12px;font-weight:bold;">Name</td><td style="padding:6px 12px;">${submission.name}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;">Email</td><td style="padding:6px 12px;"><a href="mailto:${submission.email}">${submission.email}</a></td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;">Service</td><td style="padding:6px 12px;">${submission.service || '—'}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;">Budget</td><td style="padding:6px 12px;">${submission.budget || '—'}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;">Message</td><td style="padding:6px 12px;">${submission.message || '—'}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;">Time</td><td style="padding:6px 12px;">${submission.submitted_at}</td></tr>
        </table>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.RESEND_FROM || 'Noxus Contact <onboarding@resend.dev>',
          to: env.CONTACT_EMAIL || 'josephjacquesmbangoedouthe@gmail.com',
          subject: `New brief from ${submission.name}`,
          html: emailHtml,
        }),
      });
    } catch (err) {
      console.error('Resend email failed (submission still logged):', err);
    }
  }

  return jsonResponse({ ok: true }, 200, request);
}
