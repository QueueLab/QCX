<div align="center">

# Quality Computer Experience (QCX)

### A Gravitational General Intelligence Interface. 

[**Pricing**](https://buy.stripe.com/14A3cv7K72TR3go14Nasg02) &nbsp;|&nbsp; [**Land**](https://wwww.queue.cx) &nbsp;|&nbsp; [**X**](https://x.com/tryqcx)

<a href="https://www.producthunt.com/products/qcx?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-qcx" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1035588&theme=light&t=1762583679476" alt="QCX - Artificial&#0032;General&#0032;Intelligence&#0046; | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
</div>

---

<img width="1882" height="850" alt="Screenshot 2026-07-27 101948" src="https://github.com/user-attachments/assets/55a4a45e-41db-4576-95b1-af435dcbb45d" />


---

## 🌍 Introduction

**Quality Computer Experience (QCX)** is a production-ready, cloud-optimized **Planetary Copilot and Geospatial Intelligence Platform** built with Next.js, Tailwind CSS, Radix UI, Drizzle ORM, Clerk, Supabase, and Mapbox GL. It empowers intelligence analysts, researchers, and developers to converse with geographic locations, search for satellite imagery, analyze historical data, download comprehensive reports, and query high-fidelity planet-scale observations using state-of-the-art Generative AI/UI.

---

## 🚀 Key Features & Capabilities

### 1. Planetary Copilot (Generative AI/UI)
- **Vercel AI SDK Core**: Stream-updates multi-turn conversational agents that yield complex Generative UI elements directly in the chat panel.
- **Unified Provider Routing**: Seamlessly shifts requests between xAI (Grok-3-mini, Grok-2-vision), Google Gemini (Gemini 3.1 Pro), AWS Bedrock, and OpenAI, depending on key configuration and task requirements.
- **Vision-Enabled Tasks**: When handling image or visual payloads, QCX automatically routes tasks to vision-enabled models (such as `grok-vision-beta` or `grok-2-vision-1212`) as standard text-only model names do not support visual inputs.
- **Interactive Geospatial Tools**: Integrates specialized GIS tools directly into the conversational interface, allowing the agent to pan the map, query coordinates, and inspect locations dynamically.

### 2. Resolution Search with Time Context & News Integration
- **Temporal Context Enrichment**: Renders exact local time with accurate timezone calculation for searched areas, allowing analysts to correlate temporal state with satellite observations.
- **Reverse Geocoding**: Automatically resolves latitude and longitude coordinates to human-readable place names using the OpenStreetMap Nominatim API.
- **Real-Time News Retrieval**: Fetches location-specific, recent news via the Tavily AI Search API (filtered to the past week for relevance) and feeds this context directly into the AI analysis, letting analysts link visual anomalies to real-world current events.

### 3. SkyFi Satellite Imagery Integration
- **OAuth 2.1 with PKCE & Dynamic Client Registration (DCR)**: Secures satellite tasking and imagery searches using per-user OAuth tokens. Client registrations are reused dynamically only if current redirect URIs match database records, otherwise executing safe client re-registration.
- **Token Rotation & Conservative Expiry**: Automatically rotates and refreshes OAuth credentials within the `tokens()` method of `SkyfiOAuthProvider` upon token expiration or if expiration metadata is missing.
- **WKT Polygon Converters**: Takes Mapbox drawn features (GeoJSON geometries) and automatically converts them to EPSG:4326 Well-Known Text (WKT) polygons to execute precise archive search and imagery query requests, while rejecting non-polygon features (e.g., LineStrings) where an Area of Interest (AOI) is mandatory.
- **Failsafe Dry-Runs**: To guard users from accidental billing charges, the SkyFi `place_order` tool requires a strict `confirm: true` parameter. Lacking this, it defaults to a dry-run estimate via `validate_order` and issues an explicit configuration warning.
- **Deterministic Idempotency Keys**: Utilizes a stable derivation pattern (`stableIdempotencyKey`) based on User ID, AOI, query parameters, and order IDs to ensure duplicate transactions are rejected by SkyFi endpoints.

### 4. AlphaEarth Foundations Satellite Embeddings API
- **High-Dimensional Temporal Embeddings**: Access Google’s AlphaEarth Foundations satellite dataset stored in Google Cloud Storage (GCS). Retrieve a 64-dimensional temporal embedding representing a full year of multi-sensor satellite observations for any coordinate (10×10m resolution) from 2017 to 2024.
- **Cloud-Optimized GeoTIFF (COG) Indexing**: Leverages an `aef_index.csv` local index file to map geographic coordinates to specific target GCS COG files.
- **UTM Projection & Range Requests**: Performs WGS84 to UTM cartographic projection via `proj4`. Generates temporary signed URLs for "requester pays" GCS buckets, then initiates highly targeted GCS range requests using the `geotiff` library to fetch *only* the single required pixel, bypassing massive file downloads.
- **Dequantization**: Automatically converts raw 8-bit integer quantities from range requests into floats scaled between -1 and 1.

### 5. Dual-Write Consistency & Access Control
- **Clerk-Supabase Auth Synchronization**: Combines Clerk's Native Third-Party Auth with Supabase JWT validation via JSON Web Key Sets (JWKS). This bypasses shared JWT secrets and simplifies security.
- **Dual-Database Writes**: Syncs user profile metadata (names, emails, avatars, custom system prompts, and business domains) between the application's primary Drizzle PostgreSQL database and the QCX-BACKEND Supabase database via edge functions and RPC triggers.
- **Granular Row-Level Security (RLS)**: Enforces strict data access boundaries on 8 core tables (`users`, `chats`, `messages`, `calendar_notes`, `chat_participants`, `locations`, `system_prompts`, `visualizations`) ensuring users only view or modify records they own.
- **Resilient Multi-User state synchronization**: Handles individual message ownership, deduplicates concurrent writes deterministically, and supports real-time updates via Supabase Realtime subscriptions.

### 6. Performance & UX Optimizations
- **UI Batching & Caching**: Batches streamed agent updates to prevent excessive layout re-renders. Query suggestor includes result caching (5-minute TTL, 50 entries max) and update throttling (200ms) to accelerate response times.
- **React Memoization**: Wraps parent components (e.g., `Copilot`, `SearchRelated`) in `React.memo` with custom comparison and memoizes handlers and values using `useCallback` and `useMemo`.
- **Debounced Updates**: Debounces Next.js router refreshes (300ms delay) and Mapbox drawing context updates (500ms delay) to prevent full-page re-mounts.
- **Interactive Components**: Features high-fidelity UX elements such as a comparative slider for imagery, an dynamic carousel for multi-resolution images, and a loading screen bypass for headless automated testing.

### 7. Google Cloud Build CI/CD & Production Containerization
- **Multi-Stage Build Pipeline**: Utilizes an optimized Dockerfile separating dependencies, the Next.js standalone builder, and a production runner that minimizes image sizes from 1.5GB to under 300MB.
- **Privilege Separation**: Executes the container process under a dedicated non-root user (`nextjs:nodejs` UID 1001) for robust cloud execution environments.
- **Automated Cloud Build Deployments**: Configured with `cloudbuild.yaml` for automatic image building, caching, and gradual traffic rollouts on Google Cloud Run.

---

## 🛠️ Technology Stack

| Category | Technologies Used |
| :--- | :--- |
| **Framework & Core** | [Next.js (App Router)](https://nextjs.org/), [React 19](https://react.dev/), [Bun Runtime](https://bun.sh/) |
| **Generative AI/UI** | [Vercel AI SDK Core](https://sdk.vercel.ai/), [xAI Grok](https://x.ai/), [Google Gemini](https://ai.google.dev/) |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/), [Drizzle ORM](https://orm.drizzle.team/), [Supabase](https://supabase.com/) |
| **Authentication** | [Clerk Native Auth](https://clerk.com/) |
| **Mapping & Geospatial** | [Mapbox GL JS](https://www.mapbox.com/mapbox-gljs), [Turf.js](https://turfjs.org/), [Proj4.js](https://github.com/proj4js/proj4js), [GeoTIFF.js](https://github.com/geotiffjs/geotiff.js) |
| **Scraping & News** | [Firecrawl JS](https://www.firecrawl.dev/), [Tavily AI](https://tavily.com/), [Exa AI](https://exa.ai/) |
| **UI Components** | [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/) |

---

## ⚙️ Detailed Installation & Local Setup

### Step 1: Install Bun Package Manager
QCX requires **Bun** as its package manager and runtime:
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### Step 2: Clone the Repository and Install Dependencies
```bash
git clone https://github.com/QueueLab/QCX.git
cd QCX
bun install
```

### Step 3: Run Database Migrations
Generate and apply migrations to your local/target PostgreSQL database using Drizzle:
```bash
bun x drizzle-kit generate
bun run db:migrate
```

### Step 4: AlphaEarth Satellite Index Setup (Optional)
If you want to use the AlphaEarth GCS satellite embeddings API, retrieve the 13.5MB index file:
```bash
node download_index.js
```
*Note: Ensure your GCP credentials are placed in `gcp_credentials.json` at the root directory and pointed to via `GCP_CREDENTIALS_PATH` in your `.env.local`.*

### Step 5: Start the Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🎛️ Comprehensive Environment Variables Guide

Create a `.env.local` file in your root folder. Use the following guide to populate the credentials:

```bash
# ==========================================
# 1. APPLICATION & INFRASTRUCTURE CONFIG
# ==========================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PORT=3000

# ==========================================
# 2. ENCRYPTION SYSTEM (Security Hardening)
# ==========================================
# Must be a 32-byte (64 hex characters) key. Used for aes-256-gcm encryption.
ENCRYPTION_KEY="your_64_character_hex_key_here"

# ==========================================
# 3. DATABASE & ORM CONNECTIONS
# ==========================================
# Primary PostgreSQL Database URL (Drizzle)
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"

# Supabase REST API & Service Keys (QCX-BACKEND Integration)
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Upstash Redis (For AI Caching and Throttling)
UPSTASH_REDIS_REST_URL="https://your-redis-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-token"

# ==========================================
# 4. AUTHENTICATION (Clerk)
# ==========================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_clerk_key"
CLERK_SECRET_KEY="sk_test_your_clerk_secret"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# ==========================================
# 5. MAPPING & GIS
# ==========================================
# Retrieve from Mapbox dashboard: https://account.mapbox.com/
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="pk.your_mapbox_token_here"

# ==========================================
# 6. GENERATIVE AI PROVIDERS (Model Keys)
# ==========================================
# xAI API Key (Grok models) - PLATFORM PRIMARY CHOICE
XAI_API_KEY="xai-your-api-key"

# Gemini 3.1 Pro (Google Generative AI)
GEMINI_3_PRO_API_KEY="your_gemini_3_pro_api_key_here"

# OpenAI API Key (Fallback models)
OPENAI_API_KEY="sk-your-openai-key"

# AWS Bedrock Credentials (Fallback models)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"

# ==========================================
# 7. SCRAPING, SEARCH & INTEGRATIONS
# ==========================================
# Tavily AI API Key (Location News & Web Searches)
TAVILY_API_KEY="tvly-your-tavily-key"

# Exa AI API Key (Alternative Web Research)
EXA_API_KEY="exa-your-exa-key"

# Firecrawl API Key (Dynamic Web Scraping with fallback Standard Fetch)
FIRECRAWL_API_KEY="fc-your-firecrawl-key"

# ==========================================
# 8. ALPHAEARTH GCS EMBEDDINGS (Optional)
# ==========================================
GCP_PROJECT_ID="your-gcp-project-id"
GCP_CREDENTIALS_PATH="./gcp_credentials.json"

# ==========================================
# 9. TESTING CONFIG
# ==========================================
# Enables Clerk bypass under Playwright headless execution
NEXT_PUBLIC_PLAYWRIGHT_TEST="false"
```

---

## 🧪 Testing & Automated Verification

### Running Playwright End-to-End (E2E) Tests
QCX includes a robust suite of E2E tests validating the calendar, conversational flows, image attachment functionality, map toggling, mobile responsiveness, and report outputs.

Install browsers:
```bash
npx playwright install
```

Execute headless verification:
```bash
bun run test:e2e
```

### Clerk Bypass for Playwright Testing
To run local Playwright tests without setting up interactive Clerk login scripts, configure the environment:
```bash
export NEXT_PUBLIC_PLAYWRIGHT_TEST=true
export NEXT_PUBLIC_SUPABASE_URL="https://mock.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="mock-key"
```
This bypass enables the `useCurrentUser()` hook to mock a dummy testing profile and instructs `middleware.ts` to seamlessly forward internal page requests.

---

## 🐳 Docker Deployment & Cloud Build

### 1. Build and Run Container Locally (with Docker Compose)
The repository contains a fully structured, multi-profile `docker-compose.yaml` to run both production standalone or hot-reloading development instances.

Run the production build:
```bash
docker-compose up --build
```

Run the development profile with hot-reload:
```bash
docker-compose --profile dev up qcx-dev --build
```

### 2. CI/CD Google Cloud Build Pipeline
The `cloudbuild.yaml` file defines an automated build flow targeting Google Cloud Registry & Cloud Run:
- Implements Docker layer caching using registry tags.
- Builds a Next.js standalone artifact under an unprivileged user space.
- Deploys automatically to Google Cloud Run with custom memory parameters.

---

## 📜 License

This project is licensed under the terms of the **CC BY-NC 4.0** (Creative Commons Attribution-NonCommercial 4.0 International) or **Apache 2.0** as indicated in the LICENSE files. Please check the project root `LICENSE` file for precise legal terms.

---

<div align="center">
Made with ❤️ by the QueueLab Team.
</div>
