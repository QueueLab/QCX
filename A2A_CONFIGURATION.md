# Agent-to-Agent (A2A) Protocol Configuration & Usage Guide

This repository integrates the official **Agent-to-Agent (A2A) Protocol** ([a2a-protocol.org](https://a2a-protocol.org)) using [`@a2a-js/sdk`](https://github.com/a2aproject/a2a-js). QCX-Terra can act both as an **A2A Client** (invoking specialized remote agents on other systems) and as an **A2A Server** (allowing external agentic systems to discover and send tasks to QCX-Terra).

---

## 1. Environment Configuration

### Remote Agents (`A2A_REMOTE_AGENTS`)

Configure remote A2A agents that QCX-Terra can communicate with using the `A2A_REMOTE_AGENTS` environment variable in `.env.local` or your runtime environment:

```env
A2A_REMOTE_AGENTS='[
  {
    "name": "weather-agent",
    "url": "https://weather.example.com",
    "apiKey": "sk_live_12345"
  },
  {
    "name": "satellite-imagery-agent",
    "url": "https://sat.example.com"
  }
]'
```

- **`name`**: Friendly identifier for the remote agent (used by internal agents for routing).
- **`url`**: The base HTTP/HTTPS URL of the remote agent serving `/.well-known/agent-card.json`.
- **`apiKey`** *(optional)*: Bearer token or authorization token injected into the `Authorization` request header.

---

## 2. A2A Client Capabilities

QCX-Terra's multi-agent system (`lib/agents/researcher.tsx`) includes the `a2aQueryTool` tool.

When a user asks QCX-Terra to consult or delegate sub-tasks to external agents (e.g., *"Ask the weather agent for the atmospheric forecast in Oregon"* or *"Delegate satellite task to https://sat.example.com"*), the agent automatically uses `a2aQueryTool` to:

1. Resolve the remote agent's URL and credentials from `A2A_REMOTE_AGENTS` or prompt argument.
2. Fetch the remote agent card via `@a2a-js/sdk` `ClientFactory`.
3. Negotiate transport (JSON-RPC or HTTP REST).
4. Stream or send the request message and return the synthesized result to the user interface.

---

## 3. A2A Server Endpoints

QCX-Terra exposes compliant A2A v1.0 server endpoints:

### Agent Card Discovery
- **Endpoint**: `GET /.well-known/agent-card.json`
- **Description**: Returns QCX-Terra's agent card, detailing supported interfaces (`JSON-RPC`, `HTTP+REST`), streaming capabilities, and available skills (`geospatial-analysis`, `satellite-embeddings`, `planet-computer`).

### Message & Task Execution Endpoint
- **Endpoint**: `POST /api/a2a`
- **Description**: Handles inbound A2A v1.0 JSON-RPC requests (`SendMessage`, `SendStreamingMessage`, `GetTask`, `CancelTask`, etc.).

#### Example Inbound JSON-RPC Request:
```bash
curl -X POST http://localhost:3000/api/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "SendMessage",
    "params": {
      "message": {
        "messageId": "msg-001",
        "role": "ROLE_USER",
        "parts": [
          {
            "content": {
              "$case": "text",
              "value": "Query latest geospatial analysis for target region."
            }
          }
        ]
      }
    }
  }'
```

---

## 4. Testing & Verification

Run the A2A integration test suite using Bun:

```bash
bun test tests-unit/a2a.test.ts
```
