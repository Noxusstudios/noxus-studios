/* ============================================================
   NOX — Noxus Studios AI intake assistant (frontend widget)
   ----------------------------------------------------------------
   Self-injects a floating button + panel into every page.
   Talks to /api/chat (Cloudflare Pages Function) which proxies Claude.
   Brand-matched, theme-aware (vanilla / brown), bilingual (EN / FR).
   ============================================================ */

(function () {
  'use strict';

  // Bail if the widget is already on the page
  if (document.querySelector('.nox-chat')) return;

  const STORAGE_KEY = 'noxus-chat-history';
  const MAX_HISTORY_LENGTH = 28; // server caps at 30 — leave headroom

  const I18N = {
    en: {
      toggle: 'Chat with Nox',
      title: 'Nox',
      role: 'AI assistant · Noxus Studios',
      welcome:
        "Hi — I'm **Nox**, Noxus's AI assistant. I can answer questions about services, pricing, and timelines, or get you on Joseph's calendar. What's your project?",
      placeholder: 'Ask Nox anything…',
      send: 'Send',
      thinking: 'Nox is typing',
      errorGeneric: "Couldn't reach Nox. Try again, or [book a call](https://calendly.com/noxusstudios/30min).",
      errorOverLimit:
        "We've covered a lot. For anything deeper, [book a call with Joseph](https://calendly.com/noxusstudios/30min).",
      errorRateLimit:
        "Too many messages too fast. Take a breath, then try again in a few minutes — or [book a call](https://calendly.com/noxusstudios/30min) to talk to Joseph directly.",
      clear: 'Clear chat',
      close: 'Close chat',
      suggestions: [
        'How much for a 5-page bilingual site?',
        'What makes hand-coded different?',
        'How long does a Custom Build take?',
        'Do you do retainers?',
      ],
    },
    fr: {
      toggle: 'Discuter avec Nox',
      title: 'Nox',
      role: 'Assistant IA · Noxus Studios',
      welcome:
        "Bonjour — je suis **Nox**, l'assistant IA de Noxus Studios. Je peux répondre à vos questions sur les services, les prix et les délais, ou vous mettre en contact avec Joseph. Quel est votre projet?",
      placeholder: 'Posez votre question à Nox…',
      send: 'Envoyer',
      thinking: 'Nox écrit',
      errorGeneric:
        "Impossible de contacter Nox. Réessayez, ou [réservez un appel](https://calendly.com/noxusstudios/30min).",
      errorOverLimit:
        "Nous avons fait le tour. Pour aller plus loin, [réservez un appel avec Joseph](https://calendly.com/noxusstudios/30min).",
      errorRateLimit:
        "Trop de messages en peu de temps. Respirez, réessayez dans quelques minutes — ou [réservez un appel](https://calendly.com/noxusstudios/30min) pour parler directement à Joseph.",
      clear: 'Effacer la conversation',
      close: 'Fermer le clavardage',
      suggestions: [
        'Combien pour un site bilingue de 5 pages?',
        'Pourquoi codé à la main?',
        'Délai pour un Sur Mesure?',
        'Forfaits mensuels disponibles?',
      ],
    },
  };

  function getLang() {
    try {
      const stored = localStorage.getItem('noxus-lang');
      if (stored === 'fr' || stored === 'en') return stored;
    } catch {}
    const htmlLang = document.documentElement.getAttribute('lang');
    return htmlLang === 'fr' ? 'fr' : 'en';
  }

  function t() {
    return I18N[getLang()] || I18N.en;
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(-MAX_HISTORY_LENGTH);
    } catch {}
    return [];
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY_LENGTH)));
    } catch {}
  }

  // Lightweight markdown -> HTML for assistant replies.
  // Supports: bold **text**, italic *text*, inline code `text`, links [text](url), newlines.
  function renderMarkdown(text) {
    const escape = (s) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let html = escape(text);

    // Links: [text](url)
    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Inline code: `text`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic: *text* (after bold so ** isn't caught)
    html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');

    // Bullets: lines starting with "- " become <li> grouped into a single <ul>
    const lines = html.split('\n');
    const out = [];
    let inList = false;
    for (const line of lines) {
      const bulletMatch = line.match(/^-\s+(.+)$/);
      if (bulletMatch) {
        if (!inList) {
          out.push('<ul>');
          inList = true;
        }
        out.push(`<li>${bulletMatch[1]}</li>`);
      } else {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        out.push(line);
      }
    }
    if (inList) out.push('</ul>');

    // Paragraph-break double newlines, single newlines become <br>
    return out
      .join('\n')
      .split(/\n{2,}/)
      .map((para) => `<p>${para.trim().replace(/\n/g, '<br>')}</p>`)
      .filter((p) => p !== '<p></p>')
      .join('');
  }

  // ---- Build DOM ----
  const root = document.createElement('div');
  root.className = 'nox-chat';
  root.dataset.state = 'closed';
  root.innerHTML = `
    <button class="nox-chat__toggle" type="button" aria-label="${t().toggle}" aria-expanded="false">
      <span class="nox-chat__toggle-icon" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
          <line x1="16" y1="3" x2="16" y2="6.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
          <circle cx="16" cy="2.5" r="1.4" fill="currentColor"/>
          <rect x="6" y="7" width="20" height="20" rx="3.2" fill="currentColor"/>
          <rect class="nox-face-eye" x="10" y="12.8" width="3.4" height="3" rx="1" fill="#E8540A"/>
          <rect class="nox-face-eye" x="18.6" y="12.8" width="3.4" height="3" rx="1" fill="#E8540A"/>
          <path d="M 11.5 21.5 Q 16 23.4 20.5 21.5" stroke="#E8540A" stroke-width="1.25" stroke-linecap="round" fill="none"/>
        </svg>
      </span>
      <span class="nox-chat__toggle-dot" aria-hidden="true"></span>
    </button>

    <div class="nox-chat__panel" role="dialog" aria-label="${t().title} chat" aria-hidden="true">
      <header class="nox-chat__header">
        <div class="nox-chat__brand">
          <span class="nox-chat__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
              <line x1="16" y1="3" x2="16" y2="6.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
              <circle cx="16" cy="2.5" r="1.4" fill="currentColor"/>
              <rect x="6" y="7" width="20" height="20" rx="3.2" fill="currentColor"/>
              <rect class="nox-face-eye" x="10" y="12.8" width="3.4" height="3" rx="1" fill="#E8540A"/>
              <rect class="nox-face-eye" x="18.6" y="12.8" width="3.4" height="3" rx="1" fill="#E8540A"/>
              <path d="M 11.5 21.5 Q 16 23.4 20.5 21.5" stroke="#E8540A" stroke-width="1.25" stroke-linecap="round" fill="none"/>
            </svg>
          </span>
          <div class="nox-chat__brand-text">
            <div class="nox-chat__name" data-nox-i18n="title">${t().title}</div>
            <div class="nox-chat__role" data-nox-i18n="role">${t().role}</div>
          </div>
        </div>
        <button class="nox-chat__close" type="button" aria-label="${t().close}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round">
            <line x1="6" y1="6" x2="18" y2="18"/>
            <line x1="18" y1="6" x2="6" y2="18"/>
          </svg>
        </button>
      </header>

      <div class="nox-chat__messages" aria-live="polite"></div>

      <form class="nox-chat__form">
        <textarea class="nox-chat__input" rows="1" placeholder="${t().placeholder}" data-nox-i18n-placeholder="placeholder"></textarea>
        <button class="nox-chat__send" type="submit" aria-label="${t().send}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none"/>
          </svg>
        </button>
      </form>

      <footer class="nox-chat__footer">
        <button class="nox-chat__clear" type="button" data-nox-i18n="clear">${t().clear}</button>
      </footer>
    </div>
  `;
  document.body.appendChild(root);

  // ---- Wire up references ----
  const toggleBtn = root.querySelector('.nox-chat__toggle');
  const panel = root.querySelector('.nox-chat__panel');
  const closeBtn = root.querySelector('.nox-chat__close');
  const messagesEl = root.querySelector('.nox-chat__messages');
  const form = root.querySelector('.nox-chat__form');
  const input = root.querySelector('.nox-chat__input');
  const sendBtn = root.querySelector('.nox-chat__send');
  const clearBtn = root.querySelector('.nox-chat__clear');

  let history = loadHistory();
  let isLoading = false;

  // ---- Render conversation ----
  function renderHistory() {
    messagesEl.innerHTML = '';

    if (history.length === 0) {
      appendMessage('assistant', t().welcome, { skipStore: true, isWelcome: true });
      renderSuggestions();
    } else {
      for (const msg of history) {
        appendMessage(msg.role, msg.content, { skipStore: true });
      }
    }

    scrollToBottom();
  }

  function renderSuggestions() {
    const dict = t();
    if (!Array.isArray(dict.suggestions) || dict.suggestions.length === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'nox-chat__suggestions';

    for (const text of dict.suggestions) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'nox-chat__chip';
      chip.textContent = text;
      chip.addEventListener('click', () => {
        sendMessage(text);
      });
      wrap.appendChild(chip);
    }

    messagesEl.appendChild(wrap);
  }

  function clearSuggestions() {
    const wrap = messagesEl.querySelector('.nox-chat__suggestions');
    if (wrap) wrap.remove();
  }

  function appendMessage(role, content, opts = {}) {
    const el = document.createElement('div');
    el.className = `nox-chat__msg nox-chat__msg--${role}`;
    if (opts.isWelcome) el.dataset.welcome = 'true';

    if (role === 'assistant') {
      el.innerHTML = renderMarkdown(content);
    } else {
      const p = document.createElement('p');
      p.textContent = content;
      el.appendChild(p);
    }

    messagesEl.appendChild(el);

    if (!opts.skipStore) {
      history.push({ role, content });
      saveHistory(history);
    }

    scrollToBottom();
    return el;
  }

  function appendThinking() {
    const el = document.createElement('div');
    el.className = 'nox-chat__msg nox-chat__msg--assistant nox-chat__msg--thinking';
    el.innerHTML = `<span class="nox-chat__dots"><span></span><span></span><span></span></span><span class="nox-chat__thinking-text">${t().thinking}</span>`;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // ---- Open / close ----
  function openPanel() {
    root.dataset.state = 'open';
    toggleBtn.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    // Focus input after the transition settles
    setTimeout(() => input.focus(), 200);
  }

  function closePanel() {
    root.dataset.state = 'closed';
    toggleBtn.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
  }

  toggleBtn.addEventListener('click', () => {
    if (root.dataset.state === 'open') closePanel();
    else openPanel();
  });

  closeBtn.addEventListener('click', closePanel);

  // Esc closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.dataset.state === 'open') closePanel();
  });

  // ---- Clear chat ----
  clearBtn.addEventListener('click', () => {
    history = [];
    saveHistory(history);
    renderHistory();
  });

  // ---- Auto-resize textarea ----
  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }
  input.addEventListener('input', autoResize);

  // ---- Submit ----
  async function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    isLoading = true;
    sendBtn.disabled = true;
    input.disabled = true;

    clearSuggestions();
    appendMessage('user', text.trim());
    input.value = '';
    autoResize();

    const thinkingEl = appendThinking();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      thinkingEl.remove();

      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        if (body.error && /Conversation got long/i.test(body.error)) {
          appendMessage('assistant', t().errorOverLimit);
        } else {
          appendMessage('assistant', body.error || t().errorGeneric);
        }
      } else if (res.status === 429) {
        appendMessage('assistant', t().errorRateLimit);
      } else if (!res.ok) {
        appendMessage('assistant', t().errorGeneric);
      } else {
        const data = await res.json();
        const reply = data.reply || '…';
        appendMessage('assistant', reply);
      }
    } catch (err) {
      thinkingEl.remove();
      appendMessage('assistant', t().errorGeneric);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(input.value);
  });

  // Enter to send, Shift+Enter for newline
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  // ---- Update language on toggle change ----
  function applyLanguage() {
    const dict = t();
    toggleBtn.setAttribute('aria-label', dict.toggle);

    root.querySelectorAll('[data-nox-i18n]').forEach((el) => {
      const key = el.getAttribute('data-nox-i18n');
      if (dict[key]) el.textContent = dict[key];
    });

    root.querySelectorAll('[data-nox-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-nox-i18n-placeholder');
      if (dict[key]) el.setAttribute('placeholder', dict[key]);
    });

    closeBtn.setAttribute('aria-label', dict.close);
    sendBtn.setAttribute('aria-label', dict.send);

    // Re-render history so the welcome message also switches language
    if (history.length === 0) {
      renderHistory();
    }
  }

  // Watch for language toggle clicks
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-lang]');
    if (target) {
      setTimeout(applyLanguage, 50);
    }
  });

  // Initial render
  renderHistory();
})();
