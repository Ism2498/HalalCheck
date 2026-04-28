// API_KEY is loaded from config.js (see config.example.js)
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL   = 'llama-3.3-70b-versatile';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const productNameEl = document.getElementById('productName');
const loadingView   = document.getElementById('loadingView');
const verdictView   = document.getElementById('verdictView');
const errorView     = document.getElementById('errorView');
const errorMsg      = document.getElementById('errorMsg');
const verdictCard   = document.getElementById('verdictCard');
const verdictIcon   = document.getElementById('verdictIcon');
const verdictLabel  = document.getElementById('verdictLabel');
const badgesEl      = document.getElementById('badges');
const explanationEl = document.getElementById('explanation');
const concernsWrap  = document.getElementById('concernsWrap');
const concernsList  = document.getElementById('concernsList');

// ── Helpers ───────────────────────────────────────────────────────────────────
function show(el)  { el.classList.remove('hidden'); }
function hide(el)  { el.classList.add('hidden'); }

function dotClass(status) {
  if (status === 'certified') return 'dot-green';
  if (status === 'unlikely')  return 'dot-red';
  return 'dot-yellow';
}

function statusLabel(status) {
  return {
    certified: 'Certified',
    likely:    'Not Certified',
    unlikely:  'Unlikely',
    uncertain: 'Uncertain',
  }[status] ?? status;
}

// ── Extract product name from the active tab ──────────────────────────────────
async function getProductName() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const selectors = [
        '#productTitle',
        '#title',
        '[data-testid="product-title"]',
        '[data-testid="pdp-product-title"]',
        '.product-title', '.product-name',
        '.pdp-title', '.item-title',
        '.woocommerce-loop-product__title',
        'h1.title', 'h1.heading',
        'h1',
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const text = (el.innerText || el.textContent || '').trim();
          if (text.length > 2 && text.length < 300) return text;
        }
      }

      const title = document.title || '';
      return title.split(/[|\-–—]/)[0].trim() || title.trim();
    },
  });

  return (results?.[0]?.result || '').trim();
}

// ── Call Gemini API ───────────────────────────────────────────────────────────
async function checkDietaryStatus(productName) {
  const prompt = `You are a Halal and Kosher food certification expert. Analyze the food product: "${productName}"

Determine:
• halal_status: "certified" | "likely" | "unlikely" | "uncertain"
• kosher_status: "certified" | "likely" | "unlikely" | "uncertain"

Use "certified" ONLY when the product is widely known to carry official certification.
Use "likely" when permissible but NOT officially certified.

Then set verdict:
- "both"      — halal and kosher (certified or likely for both)
- "halal"     — halal only
- "kosher"    — kosher only
- "neither"   — unlikely for both
- "uncertain" — cannot be determined

Also set "ingredient_caution" to true if there are real doubts about specific ingredients
(e.g. animal-derived flavourings, gelatin, rennet, ambiguous additives). Set it to false
if the only concern is shared equipment / cross-contamination.

Respond with ONLY a raw JSON object — no markdown, no code fences:
{
  "verdict": "both|halal|kosher|neither|uncertain",
  "halal_status": "certified|likely|unlikely|uncertain",
  "kosher_status": "certified|likely|unlikely|uncertain",
  "ingredient_caution": true|false,
  "explanation": "One or two sentences summarising why.",
  "concerns": ["concern 1", "concern 2"]
}`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 120)}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? '';

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse AI response. Try again.');

  return JSON.parse(match[0]);
}

// ── Render result ─────────────────────────────────────────────────────────────
function renderResult(result) {
  hide(loadingView);
  show(verdictView);

  // Determine whether any relevant status is merely "likely" (not certified)
  const halalRelevant  = result.verdict === 'halal' || result.verdict === 'both';
  const kosherRelevant = result.verdict === 'kosher' || result.verdict === 'both';
  const isOnlyLikely   = (halalRelevant  && result.halal_status  === 'likely')
                      || (kosherRelevant && result.kosher_status === 'likely');

  // Ingredient-level doubts → yellow caution card; cross-contamination only → keep normal colour
  const showCaution = isOnlyLikely && result.ingredient_caution === true;

  const BASE_MAP = {
    both:      { icon: '✓', label: 'Halal & Kosher', theme: 'green'  },
    halal:     { icon: '✓', label: 'Halal',          theme: 'green'  },
    kosher:    { icon: '✓', label: 'Kosher',          theme: 'blue'   },
    neither:   { icon: '✗', label: 'Not Compliant',   theme: 'red'    },
    uncertain: { icon: '⚠', label: 'Uncertain',        theme: 'yellow' },
  };

  let { icon, label, theme } = BASE_MAP[result.verdict] ?? BASE_MAP.uncertain;

  if (showCaution) {
    icon  = '⚠';
    label = 'Consume with Caution';
    theme = 'yellow';
  } else if (isOnlyLikely) {
    // Likely but no ingredient concerns — soften to yellow still, just less alarming text
    icon  = '~';
    label = label + ' — Not Certified';
    theme = 'yellow';
  }

  verdictCard.className = `verdict-card ${theme}`;
  verdictIcon.textContent = icon;
  verdictLabel.textContent = label;

  badgesEl.innerHTML = `
    <div class="badge">
      <span class="dot ${dotClass(result.halal_status)}"></span>
      ☪ Halal — ${statusLabel(result.halal_status)}
    </div>
    <div class="badge">
      <span class="dot ${dotClass(result.kosher_status)}"></span>
      ✡ Kosher — ${statusLabel(result.kosher_status)}
    </div>`;

  explanationEl.textContent = result.explanation || 'No explanation provided.';

  const concerns = Array.isArray(result.concerns) ? result.concerns.filter(Boolean) : [];
  if (concerns.length) {
    show(concernsWrap);
    concernsList.innerHTML = concerns.map(c => `<span class="concern-tag">${c}</span>`).join('');
  } else {
    hide(concernsWrap);
  }
}

// ── Error display ─────────────────────────────────────────────────────────────
function renderError(msg) {
  hide(loadingView);
  hide(verdictView);
  show(errorView);
  errorMsg.textContent = msg;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const name = await getProductName();

    if (!name) {
      productNameEl.textContent = 'No product name found on this page.';
      productNameEl.classList.remove('loading');
      renderError('Could not detect a product name. Try navigating to a specific product page.');
      return;
    }

    productNameEl.textContent = name;
    productNameEl.classList.remove('loading');

    const result = await checkDietaryStatus(name);
    renderResult(result);
  } catch (err) {
    productNameEl.classList.remove('loading');
    renderError(err.message || 'An unexpected error occurred.');
  }
})();
