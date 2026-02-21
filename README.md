

```markdown
<div align="center">

# QCX  
**Quality Computer Experience**  
Language → Maps  
AI-powered geospatial exploration & planetary assistant

<br />

[![Watch the demo](https://img.youtube.com/vi/y8M6qaFeZOw/0.jpg)](https://youtu.be/y8M6qaFeZOw?si=eYMXxqh7vQ4I-Mhr)

<br />

[**Try Live**](https://www.queue.cx) &nbsp;•&nbsp; 
[**Pricing / Pre-sale**](https://buy.stripe.com/14A3cv7K72TR3go14Nasg02) &nbsp;•&nbsp; 
[**@tryqcx on X**](https://x.com/tryqcx) &nbsp;•&nbsp; 
[**Documentation**](https://deepwiki.com/QueueLab/QCX)

</div>

## What is QCX?

QCX is an experimental **AI-first geospatial companion** that lets you explore the planet (and beyond) through natural language + interactive maps.

- Chat with AI about any location, event, or spatial question
- Draw on the map → get measurements, analysis & AI insights
- Real-time geolocation, 3D view, time-zone aware reasoning
- Powered by multi-agent orchestration + generative UI
- Currently interpolating full chat ↔ map bidirectional integration

Built as a research prototype from **QueueLab** — exploring the frontier between natural language, spatial reasoning and artificial general intelligence.

<br />

## ✨ Features (Current & In-progress)

- Conversational geospatial queries with tool-using agents
- Interactive Mapbox map with drawing, measurements & GeoJSON
- Generative UI via Vercel AI SDK (streaming React components)
- Multi-model support (Grok, OpenAI, Google, Bedrock, …)
- Efficient task routing to minimize unnecessary LLM calls
- Persistent chat + map state (Redis + database)
- Mobile-responsive chat + map experience

<br />

## Tech Stack

| Category               | Technology                              |
|------------------------|-----------------------------------------|
| Framework              | [Next.js 15](https://nextjs.org/) (App Router + RSC) |
| Language               | TypeScript 5.x + React 19               |
| Runtime                | [Bun](https://bun.sh/)                  |
| AI SDK                 | [Vercel AI SDK](https://sdk.vercel.ai/) |
| Models                 | Grok, OpenAI, Google, Amazon Bedrock, … |
| Search / RAG           | [Tavily](https://tavily.com/), [Exa](https://exa.ai/) |
| Database / Cache       | [Upstash Redis](https://upstash.com/), PostgreSQL + Drizzle |
| UI Components          | [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/) |
| Styling                | [Tailwind CSS](https://tailwindcss.com/) + Framer Motion |
| Maps                   | [Mapbox GL JS](https://www.mapbox.com/) + Mapbox Draw |
| Alternative Maps       | Google Maps (optional)                  |

<br />

## Quick Start – Run Locally

### 1. Prerequisites

- [Bun](https://bun.sh/) ≥ 1.1
- Node.js (only for compatibility checks — app runs on Bun)

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash
```

### 2. Clone & Install

```bash
git clone https://github.com/QueueLab/QCX.git
cd QCX
bun install
```

### 3. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
# AI providers (at least one required)
XAI_API_KEY=                 # https://console.x.ai
OPENAI_API_KEY=              # optional
GOOGLE_API_KEY=              # optional (Gemini)
BEDROCK_ACCESS_KEY_ID=       # optional
BEDROCK_SECRET_ACCESS_KEY=   # optional

# Search
TAVILY_API_KEY=
# or
EXA_API_KEY=

# Upstash Redis (for rate limiting, caching, prompt storage)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Mapbox (required for maps)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=

# Optional: database, analytics, etc.
```

> **Note**: Complex generative UI and tool calling works best with frontier models (Grok family, GPT-4o, Claude 3.5/4, Gemini 1.5/2, etc.). Smaller or local models may not format output correctly.

### 4. Run

```bash
bun run dev
# or for production build preview
bun run build && bun run start
```

Open http://localhost:3000

<br />

## Contributing

We welcome contributions — especially around:

- Better map ↔ chat integration
- New geospatial tools / agents
- UI/UX polish (mobile especially)
- Model output parsing robustness
- Performance optimizations

1. See open [issues](https://github.com/QueueLab/QCX/issues)
2. Fork & create a branch
3. Submit a PR with clear description

Read the in-depth architecture & component docs here:  
→ https://deepwiki.com/QueueLab/QCX

<br />

## Verified Models (Stable Output Formatting)

- Grok-3-mini  
- (add more models as tested — PRs welcome!)

Models with reasoning / heavy tool calling can sometimes break generative UI — test carefully.

<br />

<div align="center">

**QCX** — Language is the new UI for exploring worlds.

Made with curiosity by [QueueLab](https://github.com/QueueLab)

</div>
```

### Key Improvements Made

- Clear project tagline + one-sentence purpose at top
- Better visual hierarchy with emoji sections, tables, code blocks
- Fixed typos (wwww → www, inconsistent headers)
- Modern quick-start flow (Bun emphasis)
- More honest note about model compatibility
- Removed redundant repetition
- Added contributing motivation + link to deepwiki
- Cleaner links section
- Research / AGI flavor preserved without overhyping

Feel free to copy-paste this directly into your README.md and tweak further (e.g., add badges, screenshots, more verified models later). Good luck with QCX — looks like a very interesting spatial + AI experiment! 🚀
