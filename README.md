# HalalCheck — AI Dietary Compliance Checker

A Chrome extension that instantly checks whether a food product is **Halal**, **Kosher**, both, or neither — directly from any product page.

Powered by **Groq AI** (Llama 3.3 70B), it reads the product name from the page, sends it to the AI, and returns a clear color-coded verdict in a clean dark-themed popup.

---

## Features

- Works on **any** product page — Amazon, supermarket sites, food retailers worldwide
- **Color-coded verdicts** — green for certified, yellow for caution / not certified, red for non-compliant
- **Ingredient caution detection** — distinguishes between real ingredient concerns (animal-derived flavouring, gelatin, rennet) and minor cross-contamination warnings
- **Separate Halal & Kosher badges** showing certification status for each
- **No API cost** — Groq's free tier is sufficient for personal use
- Dark-themed popup, no clutter

---

## Screenshots

| Certified | Consume with Caution | Not Compliant |
|:---------:|:--------------------:|:-------------:|
| Green ✓ card | Yellow ⚠ card | Red ✗ card |

---

## Verdict Logic

| Card | Colour | Meaning |
|------|--------|---------|
| Halal & Kosher / Halal / Kosher | 🟢 Green | Officially certified or widely recognised as compliant |
| Halal — Not Certified / Kosher — Not Certified | 🟡 Yellow | Likely permissible but **no official certification** found |
| Consume with Caution | 🟡 Yellow | Likely permissible but contains **ingredients with real doubt** (e.g. ambiguous flavourings, additives) |
| Uncertain | 🟡 Yellow | Insufficient information to determine compliance |
| Not Compliant | 🔴 Red | Unlikely to be Halal or Kosher |

> Cross-contamination warnings (shared equipment) are shown in the concerns list but do **not** trigger the caution card on their own — only actual ingredient doubts do.

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/Ism2498/HalalCheck.git
cd HalalCheck
```

### 2. Add your Groq API key

Get a free key at [console.groq.com](https://console.groq.com) — no credit card required.

```bash
cp config.example.js config.js
```

Open `config.js` and replace the placeholder:

```js
const API_KEY = 'YOUR_GROQ_API_KEY_HERE';
```

### 3. Load into Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `HalalCheck` folder

The extension icon will appear in your toolbar.

---

## Usage

1. Navigate to any food product page
2. Click the **HalalCheck** icon in the toolbar
3. The popup detects the product name and queries the AI
4. The verdict appears within a couple of seconds

### Works well on

- `amazon.com`, `amazon.co.uk`, `amazon.sa`, and other Amazon storefronts
- Supermarket websites (Walmart, Tesco, Carrefour, etc.)
- Dedicated food retailers and brand product pages

---

## Project Structure

```
HalalCheck/
├── manifest.json        # Chrome extension manifest (MV3)
├── popup.html           # Dark-themed popup UI
├── popup.js             # Product name extraction + Groq API logic
├── config.js            # Your API key — gitignored, never committed
├── config.example.js    # Template for config.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## How It Works

1. **Product detection** — when the popup opens, a script runs in the active tab and checks a prioritised list of CSS selectors (`#productTitle`, `h1`, `.product-title`, etc.). Falls back to the page `<title>` if nothing matches.
2. **AI query** — the product name is sent to Groq's API using the `llama-3.3-70b-versatile` model with a structured prompt that returns a strict JSON verdict.
3. **Caution logic** — the AI separately flags `ingredient_caution` (true/false) to distinguish between dubious ingredients and mere shared-equipment concerns. The UI renders accordingly.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension | Chrome Manifest V3 |
| AI Model | Llama 3.3 70B via Groq API |
| UI | Vanilla HTML/CSS/JS, dark theme |
| Icons | Generated with Node.js + pure PNG encoding |

---

## Configuration

| Variable | File | Description |
|----------|------|-------------|
| `API_KEY` | `config.js` | Your Groq API key |
| `MODEL` | `popup.js:3` | Groq model ID (default: `llama-3.3-70b-versatile`) |

To switch models, edit line 3 of `popup.js`. Other capable Groq models:
- `llama-3.1-8b-instant` — faster, slightly less accurate
- `mixtral-8x7b-32768` — good alternative

---

## Privacy

- No data is stored or logged by this extension
- The product name is sent to Groq's API for inference — subject to [Groq's privacy policy](https://groq.com/privacy-policy/)
- Your API key lives only in your local `config.js` and is never committed or transmitted anywhere except Groq's endpoint

---

## License

MIT — do whatever you want with it.
