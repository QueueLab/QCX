# Manus AI Integration

This document describes the integration of Manus AI into the QCX platform.

## Overview

Manus AI has been integrated as a specialized tool available to the QCX Researcher Agent. This integration enables QCX to delegate complex, multi-step tasks to the Manus AI platform, which can perform advanced reasoning, research, code execution, and workflow automation.

## Architecture Decision

The Manus integration follows a **tool-based architecture** rather than creating a separate agent. This decision was made based on several factors:

- **Consistency**: Aligns with existing QCX patterns (search, retrieve, geospatial tools)
- **Simplicity**: Minimal changes to existing routing logic
- **Flexibility**: The Researcher Agent can intelligently decide when Manus is appropriate
- **Maintainability**: Follows established patterns in the codebase
- **Cost Efficiency**: Avoids unnecessary LLM calls for routing decisions

## Implementation Details

### Files Created

1. **`lib/schema/manus.tsx`** - Zod schema for Manus tool parameters
   - Defines validation for prompt, agentProfile, taskMode, and interactiveMode
   - Provides TypeScript types for type safety

2. **`lib/agents/tools/manus.tsx`** - Manus tool implementation
   - Handles API calls to Manus AI platform
   - Manages error handling and UI updates
   - Creates tasks and returns task information

3. **`components/manus-section.tsx`** - UI component for displaying Manus task results
   - Shows task title, ID, and status
   - Provides links to view task progress and share results
   - Follows QCX design patterns

### Files Modified

1. **`lib/agents/tools/index.tsx`** - Tool registry
   - Added Manus tool import
   - Conditionally registers Manus tool when MANUS_API_KEY is present

2. **`.env.local.example`** - Environment configuration
   - Added MANUS_API_KEY configuration with documentation

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```bash
# Manus AI API Key
# Get your API key from https://open.manus.im/docs/quickstart
MANUS_API_KEY="your_manus_api_key_here"
```

### Getting Your API Key

1. Visit the [Manus API Integration settings](https://open.manus.im/docs/quickstart)
2. Generate a new API key
3. Add it to your `.env.local` file
4. Restart your development server

## Usage

Once configured, the Manus tool is automatically available to the QCX Researcher Agent. The agent will use Manus for tasks that require:

- Complex multi-step workflows
- Deep research across multiple sources
- Code execution or file manipulation
- Advanced reasoning and planning
- Tasks beyond simple search and retrieval

### Tool Parameters

The Manus tool accepts the following parameters:

- **prompt** (required): The task instruction for Manus
- **agentProfile** (optional): Agent profile to use
  - `manus-1.6` (default) - Balanced performance
  - `manus-1.6-lite` - Faster execution
  - `manus-1.6-max` - Most capable
- **taskMode** (optional): Execution mode
  - `chat` - Conversational mode
  - `adaptive` - Adaptive mode
  - `agent` - Full agent mode
- **interactiveMode** (optional): Enable follow-up questions (default: false)

### Example Usage

When a user asks a complex question like "Research the latest developments in quantum computing and create a comprehensive report with code examples," the Researcher Agent may decide to use the Manus tool:

```typescript
{
  prompt: "Research the latest developments in quantum computing and create a comprehensive report with code examples",
  agentProfile: "manus-1.6",
  taskMode: "agent",
  interactiveMode: false
}
```

The tool will:
1. Create a task on the Manus platform
2. Display a loading state in the UI
3. Show the task information with links to view progress
4. Return task details to the Researcher Agent for context

## API Reference

### Manus API Endpoint

- **URL**: `https://api.manus.ai/v1/tasks`
- **Method**: POST
- **Authentication**: API_KEY header

### Request Schema

```typescript
{
  prompt: string
  agentProfile: 'manus-1.6' | 'manus-1.6-lite' | 'manus-1.6-max'
  taskMode?: 'chat' | 'adaptive' | 'agent'
  interactiveMode?: boolean
  createShareableLink?: boolean
}
```

### Response Schema

```typescript
{
  task_id: string
  task_title: string
  task_url: string
  share_url?: string
}
```

## Future Enhancements

Potential improvements for future iterations:

1. **Task Result Polling**: Implement polling to fetch and display task results directly in QCX
2. **Webhook Integration**: Use Manus webhooks for real-time task completion notifications
3. **Connector Support**: Enable Manus connectors (Gmail, Notion, Google Calendar, etc.)
4. **Dedicated Agent**: Create a specialized Manus agent for complex workflows requiring multiple Manus calls
5. **File Attachments**: Support file uploads to Manus tasks
6. **Multi-turn Conversations**: Enable continuing existing Manus tasks

## Testing

To test the integration:

1. Ensure MANUS_API_KEY is set in `.env.local`
2. Start the development server: `bun dev`
3. Ask a complex question that would benefit from Manus capabilities
4. Verify the Manus tool is called and task information is displayed
5. Click the task URL to view progress on the Manus platform

## Troubleshooting

### Tool Not Available

If the Manus tool is not being used:
- Check that MANUS_API_KEY is set in `.env.local`
- Restart the development server after adding the API key
- Verify the API key is valid by testing it directly with the Manus API

### API Errors

If you encounter API errors:
- Check the console for detailed error messages
- Verify your API key has not expired
- Ensure you have sufficient credits on your Manus account
- Check the Manus API status page for service issues

## Resources

- [Manus API Documentation](https://open.manus.im/docs/quickstart)
- [Manus API Reference](https://open.manus.im/docs/api-reference)
- [AI SDK Workflow Patterns](https://ai-sdk.dev/docs/agents/workflows)
- [QCX Repository](https://github.com/QueueLab/QCX)

## License

This integration follows the same license as the QCX project (Apache-2.0).
