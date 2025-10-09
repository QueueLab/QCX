<div align="center">

#  Quality  Computer  Experiences



[**Sign Up**](https://www.qcx.world) &nbsp;|&nbsp; [**Community**](https://discord.com/invite/NqGY9EWjWj) &nbsp;|&nbsp; [**X**](https://x.com/tryqcx)

</div>
Planet Computer
(in progress)

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
- Serverless Database: [Upstash](https://upstash.com/)
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

### 3. Setting up Upstash Redis

Follow the guide below to set up Upstash Redis. Create a database and obtain `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Refer to the [Upstash guide](https://upstash.com/blog/rag-chatbot-upstash#setting-up-upstash-redis) for instructions on how to proceed.

### 4. Fill out secrets

```
cp .env.local.example .env.local
```

Your .env.local file should look like this:

```
# XAI API key retrieved here: https://platform.openai.com/api-keys
XAI_API_KEY=

# Tavily API Key retrieved here: https://app.tavily.com/home
TAVILY_API_KEY=

# Upstash Redis URL and Token retrieved here: https://console.upstash.com/redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
#Mapbox access token
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
```





_Note: This project focuses on Generative UI and requires complex output from LLMs. Currently, it's assumed that the official state of the art models will be used. Although it's possible to set up other models, if you use an Standard-compatible model, but we don't guarantee that it'll work._

### 5. Run app locally

```
bun run dev
```

You can now visit http://localhost:3000.

## Verified models

List of non reasoning verified models 
Grok-3-mini
