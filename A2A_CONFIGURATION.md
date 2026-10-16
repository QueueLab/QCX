# Agent-to-Agent (A2A) Protocol Configuration & Usage Guide

This repository integrates the Agent-to-Agent (A2A) Protocol using [`@a2a-js/sdk`](https://github.com/a2aproject/a2a-js). QCX-Terra can act as an A2A client for configured remote agents and expose an A2A JSON-RPC server endpoint.

## 1. Environment Configuration

### Remote agents (`A2A_REMOTE_AGENTS`)

Configure remote agents in `.env.local` or the runtime environment:

```env
A2A_REMOTE_AGENTS='[
  {
    "name": "weather-agent",
    "url": "https://weather.example.com",
    "apiKey": "replace-with-a-secret"
  },
  {
    "name": "satellite-imagery-agent",
    "url": "https://sat.example.com"
  }
]'
```

- `name`: Agent identifier used for routing.
- `url`: Base HTTP(S) URL for the remote agent's A2A agent card.
- `apiKey` (optional): Bearer token sent to that configured agent.

Only named agents in this configuration are callable. Direct URLs are accepted only when their origin matches a configured agent; unmatched URLs are rejected to prevent server-side request forgery. If no target is supplied, the first valid configured agent is selected. An unknown explicit target never falls back to a different agent.

Set `NEXT_PUBLIC_APP_URL` to QCX-Terra's canonical public origin (for example, `https://qcx.example.com`) in production. The discovery endpoint uses this configured origin rather than untrusted request headers.

### Protecting the inbound endpoint

The `/api/a2a` endpoint is **public by default**. Its A2A responder returns a fixed informational response and does not run the user-facing agent or access user data. Deployments that need caller authentication should set `A2A_SERVER_API_KEY`; when set, every POST must include `Authorization: Bearer <same-secret>`. Keep this value secret and configure it for authorized callers. Requests larger than 1 MiB are rejected.

```env
A2A_SERVER_API_KEY=replace-with-a-long-random-secret
```

## 2. A2A Client

QCX-Terra's multi-agent system exposes `a2aQueryTool` for delegation and questions to configured remote agents. It resolves names (or same-origin URLs) from `A2A_REMOTE_AGENTS`, discovers the agent card, and uses streaming when the remote agent advertises streaming support; otherwise it sends a single A2A message. It does not retry a streaming request as a second task if streaming fails.

## 3. A2A Server Endpoints

### Agent card discovery

- **Endpoint:** `GET /.well-known/agent-card.json`
- **Description:** Returns the QCX-Terra agent card, advertising the supported `JSON-RPC` interface, streaming capability, and available skills (`geospatial-analysis`, `satellite-embeddings`, `planet-computer`).

### Message and task endpoint

- **Endpoint:** `POST /api/a2a`
- **Description:** Handles inbound A2A JSON-RPC requests through the SDK's JSON-RPC transport handler. REST transport is not advertised or implemented.

Example request:

```bash
curl -X POST https://qcx.example.com/api/a2a \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $A2A_SERVER_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "SendMessage",
    "params": {
      "message": {
        "messageId": "msg-001",
        "role": "ROLE_USER",
        "parts": [{ "content": { "$case": "text", "value": "Query latest geospatial analysis for target region." } }]
      }
    }
  }'
```

Omit the authorization header only when the deployment intentionally leaves the endpoint public (the default when `A2A_SERVER_API_KEY` is unset).

## 4. Testing

Run the A2A integration tests with Bun:

```bash
bun test tests-unit/a2a.test.ts
```
