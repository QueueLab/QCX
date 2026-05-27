<div align="center">

#  Quality  Computer  Experience



[**Pricing**](https://buy.stripe.com/14A3cv7K72TR3go14Nasg02) &nbsp;|&nbsp; [**Land**](https://wwww.queue.cx) &nbsp;|&nbsp; [**X**](https://x.com/tryqcx)

<a href="https://www.producthunt.com/products/qcx?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-qcx" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1035588&theme=light&t=1762583679476" alt="QCX - Artificial&#0032;General&#0032;Intelligence&#0046; | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
</div>

<img width="1277" alt="Screen Shot 2024-06-18 at 4 27 51 PM" src="https://github.com/QueueLab/MapGPT/assets/115367894/01584e12-b3f5-41c9-8009-a16642568798">





## Contributing

Welcome! Please see the issues for items that need attention, and below for some tools to aid in development and debugging. We're working to interpolate chat functionality onto the map module.

Documentation.

https://deepwiki.com/QueueLab/QCX

### Running the app on your own machine


## Stack

- App framework: [Next.js](https://nextjs.org/)
- Text streaming / Generative UI: [Vercel AI SDK](https://sdk.vercel.ai/docs)
- Generative Model [Varies](https://openai.com/)
- Search API: [Tavily AI](https://tavily.com/) / [Exa AI](https://exa.ai/)
- Component library: [shadcn/ui](https://ui.shadcn.com/)
- Headless component primitives: [Radix UI](https://www.radix-ui.com/)
- Styling: [Tailwind CSS](https://tailwindcss.com/)
- Mapping : [Mapbox]
(https://www.mapbox.com/)



### 2. Install dependencies

```
install bun package manager
bun install
bun run build
bun run dev
```

### 3. Fill out secrets

```
cp .env.local.example .env.local
```

Your `.env.local` file should look like this:

```
# xAI API key retrieved here: https://console.x.ai/
XAI_API_KEY=

# Tavily API Key retrieved here: https://app.tavily.com/home
TAVILY_API_KEY=

# Mapbox access token
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

See `.env.local.example` for the full list of variables including optional providers (OpenAI, AWS Bedrock, Google Maps, Serper, Exa, GCP).





_Note: This project focuses on Generative UI and requires complex output from LLMs. Currently, it's assumed that the official state of the art models will be used. Although it's possible to set up other models, if you use an Standard-compatible model, but we don't guarantee that it'll work._

### 4. Run app locally

```
bun run dev
```

You can now visit http://localhost:3000.

## Verified models

List of non reasoning verified models
Grok-3-mini
