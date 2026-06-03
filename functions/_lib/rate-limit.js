// Per-IP rate limiter for Cloudflare Pages Functions.
//
// Backed by a KV namespace bound as `RATE_LIMIT`. Without that binding the
// helper fails open (logs once and lets the request through) so the site
// keeps working before the namespace is provisioned.
//
// Strategy: fixed-window counter keyed on
//   rl:{endpoint}:{ip}:{floor(now / windowSeconds)}
// Each window expires automatically via KV's expirationTtl. Simple and
// cheap — one read + one write per allowed request.

function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

let warnedNoBinding = false;

export async function checkRateLimit(env, request, endpoint, { max, windowSeconds }) {
  const ip = clientIp(request);

  if (!env.RATE_LIMIT) {
    if (!warnedNoBinding) {
      console.warn(
        'RATE_LIMIT KV namespace not bound — rate limiting disabled. ' +
        'Bind a KV namespace as RATE_LIMIT in the Pages project to enable.'
      );
      warnedNoBinding = true;
    }
    return { ok: true, remaining: max, resetIn: windowSeconds, ip };
  }

  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const key = `rl:${endpoint}:${ip}:${bucket}`;
  const resetIn = (bucket + 1) * windowSeconds - now;

  let current = 0;
  try {
    const raw = await env.RATE_LIMIT.get(key);
    current = raw ? parseInt(raw, 10) : 0;
    if (Number.isNaN(current)) current = 0;
  } catch (err) {
    console.error('Rate limit KV read failed (failing open):', err);
    return { ok: true, remaining: max, resetIn, ip };
  }

  if (current >= max) {
    return { ok: false, remaining: 0, resetIn, ip };
  }

  try {
    await env.RATE_LIMIT.put(key, String(current + 1), {
      expirationTtl: windowSeconds + 60,
    });
  } catch (err) {
    console.error('Rate limit KV write failed (request still allowed):', err);
  }

  return { ok: true, remaining: max - current - 1, resetIn, ip };
}

export function rateLimitJsonResponse(result, extraHeaders = {}) {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please slow down and try again in a moment.',
      retryAfter: result.resetIn,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.resetIn),
        'X-RateLimit-Limit-Reset': String(result.resetIn),
        ...extraHeaders,
      },
    },
  );
}
