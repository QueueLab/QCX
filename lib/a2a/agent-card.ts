import type { AgentCard } from '@a2a-js/sdk'

/** Build the single canonical card advertised by A2A discovery and JSON-RPC. */
export const buildAgentCard = (baseUrl: string): AgentCard => ({
  name: 'QCX-Terra Agent',
  description:
    'Environment-aware planetary computer platform offering geospatial analysis, remote sensing satellite imagery processing, and multi-agent exploration.',
  supportedInterfaces: [
    {
      protocolBinding: 'JSONRPC',
      protocolVersion: '1.0',
      tenant: '',
      url: `${baseUrl.replace(/\/$/, '')}/api/a2a`
    }
  ],
  provider: undefined,
  version: '1.0.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    extensions: []
  },
  securitySchemes: {},
  securityRequirements: [],
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  skills: [
    {
      id: 'geospatial-analysis',
      name: 'Geospatial Analysis & Mapping',
      description: 'Perform spatial queries, location search, routing, and map feature analysis.',
      tags: ['geospatial', 'mapping', 'routing'],
      examples: [],
      inputModes: ['text/plain'],
      outputModes: ['text/plain'],
      securityRequirements: []
    },
    {
      id: 'satellite-embeddings',
      name: 'Satellite Image Vector Search',
      description: 'Natural language and vector similarity search over satellite and aerial imagery.',
      tags: ['satellite', 'imagery', 'vector search'],
      examples: [],
      inputModes: ['text/plain'],
      outputModes: ['text/plain'],
      securityRequirements: []
    },
    {
      id: 'planet-computer',
      name: 'Planetary Computing & Forecasting',
      description: 'Provide climate forecasting, planetary model exploration, and environmental insights.',
      tags: ['climate', 'forecasting', 'environment'],
      examples: [],
      inputModes: ['text/plain'],
      outputModes: ['text/plain'],
      securityRequirements: []
    }
  ],
  signatures: []
})
