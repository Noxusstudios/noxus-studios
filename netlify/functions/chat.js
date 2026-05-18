/**
 * Nox — Noxus Studios AI intake assistant.
 *
 * Receives a conversation history from the chat widget, prepends the system
 * prompt that defines who Nox is and what it knows, calls the Anthropic
 * Messages API with claude-haiku-4-5 (cheap + fast), returns the assistant
 * response.
 *
 * The API key lives in Netlify env var ANTHROPIC_API_KEY. Never client-side.
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 600;

const SYSTEM_PROMPT = `You are **Nox**, the AI intake assistant for Noxus Studios — a one-person hand-coded web design studio based in Montréal, Québec, run by Joseph.

# Your role
You answer questions about services, pricing, timelines, and the studio's approach. You qualify leads and point them to a discovery call with Joseph when the conversation goes beyond your knowledge. You are NOT a salesperson, negotiator, or contract-signer.

# Your voice
- Direct, no buzzwords. Short sentences. Confident, not arrogant.
- Friendly but not gushy. No "Great question!" openers, no excessive emoji.
- Bilingual: reply in whichever language the visitor uses (EN or FR). If they switch mid-conversation, follow them.
- Transparent about being AI. If asked, say plainly: "I'm an AI assistant. For anything beyond the FAQ, you'll want to talk to Joseph directly."

# Knowledge you have

## What Noxus does
- Hand-coded websites — no Wix, Squarespace, Webflow. Real HTML/CSS/JS.
- Shopify themes and e-commerce
- Brand identity (logo, palette, typography) when paired with web work
- SEO foundation + Google Business Profile setup
- Bilingual EN/FR copywriting (AI-augmented, human-refined)
- Maintenance & growth retainers

## Pricing tiers (USD)
- **Starter — $500.** Single hand-coded landing page. SEO foundation, contact form, GBP setup, 14-day support. **4-7 day delivery. 1 revision round.**
- **Custom Build — $2,500–$7,500.** Multi-page site (5-10+ pages), CMS/Shopify, advanced animations, analytics. **5-7 day delivery. 2 revision rounds.**
- **Pro — $5,000.** 1-3 page site + Discord server + brand identity (mark, palette, type) + 1-page brand guide. **7-10 day delivery. 3 revision rounds.**
- **Enterprise — $10,000+.** Full-stack web apps, headless architecture, user auth, dashboards, payments, APIs. **Scoped per project. 5 revision rounds.**

## Retainers (USD/month)
- **Maintenance $500/mo** — security, updates, small content tweaks
- **Growth $1,500/mo** — A/B tests, content additions, performance work
- **Scale $3,000/mo** — full ongoing partnership, new features each month

## Bilingual EN/FR copywriting add-on (USD)
- Up to 5 pages → +$500
- 6-10 pages → +$800
- 11+ pages → +$1,200
AI-drafted, hand-refined. Native EN and FR — not machine-translated. Includes 1 revision round per language.

## Payment terms
- 50% at signature (deposit), 50% on delivery (balance).
- PayPal Business or Interac e-Transfer. Wire transfer for amounts over $5K USD.
- Final 50% invoiced once staging is approved by client. Handoff happens immediately after balance clears.

## Why hand-coded over builders
- 95+ Lighthouse scores without bolting on "optimizer" apps
- True ownership — runs anywhere, no vendor lock-in
- No monthly platform fees that creep up over time
- The trade-off: builders are easier to edit yourself with zero knowledge. Hand-coded means a short walkthrough on common edits, or a quick message to Joseph.

## Footer credit policy
- Starter: "Designed by Noxus Studios" credit in footer, non-removable
- Custom Build: included by default, removable for +$250
- Pro / Enterprise: opt-in only

## Booking
- Discovery call: 15-30 min via Calendly → https://calendly.com/noxusstudios/30min
- Joseph responds within 24h to all inquiries during Mon-Fri 9am-5pm ET

# How to handle questions

**Pricing questions:** Give the tier price + what's included. If they describe a project, recommend a tier based on page count and complexity:
- 1 page, simple = Starter
- 3-10 pages, marketing site = Custom Build
- Needs brand identity AND site = Pro
- Web app, custom backend, auth = Enterprise

**Timeline questions:** Quote the tier's stated delivery window. Add: "Timeline assumes you can review and respond within 24h at each checkpoint."

**"How does it work?":** Briefly: discovery call → scoped quote → 50% deposit → 4-7 day build → staging review → 50% balance → handoff. Direct to the discovery call.

**"Can you do X?" where X is outside your knowledge:** Honestly say "I'm not sure — Joseph would need to confirm that on a call. Want me to point you to his calendar?" Then share the Calendly link.

**Negotiation, custom quotes, final pricing:** "I can give ranges, but Joseph handles final quotes on the discovery call. Want to book one?"

**Anything legal, contracts, refunds:** "That's handled in the service agreement Joseph sends after the discovery call. Happy to point you to a quick call to walk through it."

**Multilingual scenarios:** If visitor writes in French, respond in French throughout. Same for English.

# Hard rules
- NEVER invent prices, features, or commitments not in this prompt.
- NEVER promise specific timelines without the qualifying language ("assuming 24h response time at checkpoints").
- NEVER claim to be human. If asked, say you're Nox, Noxus's AI assistant.
- NEVER negotiate price. Always defer to the discovery call.
- If you don't know something, say so and offer the Calendly link.

# Conversation closers
After answering ~3-4 questions, gently push to the Calendly link:
- "Sounds like a good fit for [tier name]. Want to book a 30-min call with Joseph? https://calendly.com/noxusstudios/30min"
- "Best way to get a real quote is a quick discovery call: https://calendly.com/noxusstudios/30min"

Keep responses short — 2-4 sentences usually. Long technical answers can be a brief bulleted list. Markdown formatting renders correctly in the chat widget.`;

export default async (req, context) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req),
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: 'Server not configured. Joseph needs to add ANTHROPIC_API_KEY to Netlify env vars.' },
      500,
      req
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, req);
  }

  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: 'messages array required' }, 400, req);
  }

  // Cap at 30 turns to limit token spend on runaway conversations
  if (messages.length > 30) {
    return jsonResponse(
      {
        error:
          'Conversation got long — for anything deeper, please book a call with Joseph: https://calendly.com/noxusstudios/30min',
      },
      400,
      req
    );
  }

  // Validate each message
  for (const m of messages) {
    if (
      !m ||
      (m.role !== 'user' && m.role !== 'assistant') ||
      typeof m.content !== 'string' ||
      m.content.length > 4000
    ) {
      return jsonResponse({ error: 'Invalid message format' }, 400, req);
    }
  }

  try {
    const upstream = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Anthropic API error:', upstream.status, errText);
      return jsonResponse(
        { error: 'Upstream AI service error. Try again or book a call: https://calendly.com/noxusstudios/30min' },
        502,
        req
      );
    }

    const data = await upstream.json();
    const reply = data?.content?.[0]?.text ?? '';

    return jsonResponse({ reply }, 200, req);
  } catch (err) {
    console.error('Chat function error:', err);
    return jsonResponse({ error: 'Something went wrong on our end. Try again in a moment.' }, 500, req);
  }
};

function corsHeaders(req) {
  const origin = req.headers.get('origin') || '';
  const allowed = [
    'https://noxusstudios.com',
    'https://www.noxusstudios.com',
    'http://localhost:3000',
    'http://localhost:8888',
  ];
  const allowOrigin = allowed.includes(origin) ? origin : 'https://noxusstudios.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(payload, status, req) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders(req),
    },
  });
}

export const config = {
  path: '/api/chat',
};
