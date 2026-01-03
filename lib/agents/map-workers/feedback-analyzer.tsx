import { generateObject } from 'ai';
import { getModel } from '@/lib/utils';
import {
  FeedbackAnalysisSchema,
  FeedbackAnalysis,
  MapStateFeedback,
  MapCommand,
} from '@/lib/types/map-schemas';

const FEEDBACK_ANALYZER_PROMPT = `You are a specialized feedback analysis agent for map operations. Your task is to analyze map state feedback and determine if operations were successful and what actions to take next.

YOUR ROLE:
1. Evaluate if map commands executed successfully
2. Identify any issues or discrepancies
3. Recommend next actions (retry, refine, abort, continue)
4. Suggest modifications to commands if refinement is needed

ANALYSIS CRITERIA:
- Success: Map state matches expected outcome
- Partial: Some commands succeeded, others failed or incomplete
- Failed: Commands did not execute or produced wrong result

ACTIONS:
- continue: Everything successful, no further action needed
- retry: Temporary failure, retry same commands
- refine: Commands need adjustment, provide modifications
- abort: Unrecoverable error, stop operation

PROVIDE:
1. Clear status assessment
2. List of specific issues found
3. Actionable recommendations with reasoning
4. Modified commands if refinement needed`;

interface FeedbackAnalyzerInput {
  feedback: MapStateFeedback;
  originalCommands: MapCommand[];
  expectedOutcome?: {
    center?: [number, number];
    zoom?: number;
    bounds?: [[number, number], [number, number]];
  };
  attemptNumber: number;
}

/**
 * Feedback Analyzer Worker Agent
 * Analyzes map state feedback and recommends actions
 */
export async function feedbackAnalyzer(
  input: FeedbackAnalyzerInput
): Promise<FeedbackAnalysis> {
  const model = getModel();

  try {
    // Build context string
    let contextString = `Attempt Number: ${input.attemptNumber}\n\n`;
    
    contextString += `Feedback:\n`;
    contextString += `- Success: ${input.feedback.success}\n`;
    if (input.feedback.error) {
      contextString += `- Error: ${input.feedback.error}\n`;
    }
    if (input.feedback.currentCenter) {
      contextString += `- Current Center: [${input.feedback.currentCenter[0]}, ${input.feedback.currentCenter[1]}]\n`;
    }
    if (input.feedback.currentZoom !== undefined) {
      contextString += `- Current Zoom: ${input.feedback.currentZoom}\n`;
    }
    if (input.feedback.currentBounds) {
      contextString += `- Current Bounds: ${JSON.stringify(input.feedback.currentBounds)}\n`;
    }
    contextString += `\n`;

    contextString += `Original Commands:\n`;
    input.originalCommands.forEach((cmd, idx) => {
      contextString += `${idx + 1}. ${cmd.command}: ${JSON.stringify(cmd.params)}\n`;
    });
    contextString += `\n`;

    if (input.expectedOutcome) {
      contextString += `Expected Outcome:\n`;
      if (input.expectedOutcome.center) {
        contextString += `- Center: [${input.expectedOutcome.center[0]}, ${input.expectedOutcome.center[1]}]\n`;
      }
      if (input.expectedOutcome.zoom !== undefined) {
        contextString += `- Zoom: ${input.expectedOutcome.zoom}\n`;
      }
      if (input.expectedOutcome.bounds) {
        contextString += `- Bounds: ${JSON.stringify(input.expectedOutcome.bounds)}\n`;
      }
    }

    const { object } = await generateObject({
      model,
      schema: FeedbackAnalysisSchema,
      prompt: `${FEEDBACK_ANALYZER_PROMPT}\n\n${contextString}\n\nAnalyze this feedback and provide recommendations.`,
      maxTokens: 1024,
    });

    // Apply attempt-based logic
    if (input.attemptNumber >= 3 && object.recommendations.action !== 'continue') {
      // After 3 attempts, force abort if not successful
      object.recommendations.action = 'abort';
      object.recommendations.reasoning = 'Maximum retry attempts reached (3). Aborting to prevent infinite loop.';
    }

    return object;
  } catch (error) {
    console.error('Feedback Analyzer error:', error);
    
    // Fallback analysis
    if (!input.feedback.success) {
      return {
        status: 'failed',
        issues: [
          input.feedback.error || 'Unknown error occurred',
          `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        recommendations: {
          action: input.attemptNumber >= 3 ? 'abort' : 'retry',
          reasoning: input.attemptNumber >= 3 
            ? 'Maximum attempts reached, aborting'
            : 'Retrying with same commands due to analysis failure',
        },
      };
    }

    return {
      status: 'success',
      issues: [],
      recommendations: {
        action: 'continue',
        reasoning: 'Feedback indicates success, continuing despite analysis error',
      },
    };
  }
}

/**
 * Helper function to check if two coordinates are approximately equal
 */
function coordinatesMatch(
  coord1: [number, number],
  coord2: [number, number],
  tolerance: number = 0.0001
): boolean {
  return (
    Math.abs(coord1[0] - coord2[0]) < tolerance &&
    Math.abs(coord1[1] - coord2[1]) < tolerance
  );
}

/**
 * Helper function to check if zoom levels are approximately equal
 */
function zoomMatches(
  zoom1: number,
  zoom2: number,
  tolerance: number = 0.5
): boolean {
  return Math.abs(zoom1 - zoom2) < tolerance;
}

/**
 * Simple feedback analysis without LLM (fallback)
 */
export function simpleFeedbackAnalysis(
  input: FeedbackAnalyzerInput
): FeedbackAnalysis {
  const issues: string[] = [];
  
  if (!input.feedback.success) {
    issues.push(input.feedback.error || 'Command execution failed');
  }

  // Check if outcome matches expectations
  if (input.expectedOutcome && input.feedback.success) {
    if (input.expectedOutcome.center && input.feedback.currentCenter) {
      if (!coordinatesMatch(input.expectedOutcome.center, input.feedback.currentCenter)) {
        issues.push(`Center mismatch: expected ${input.expectedOutcome.center}, got ${input.feedback.currentCenter}`);
      }
    }

    if (input.expectedOutcome.zoom !== undefined && input.feedback.currentZoom !== undefined) {
      if (!zoomMatches(input.expectedOutcome.zoom, input.feedback.currentZoom)) {
        issues.push(`Zoom mismatch: expected ${input.expectedOutcome.zoom}, got ${input.feedback.currentZoom}`);
      }
    }
  }

  // Determine status
  let status: FeedbackAnalysis['status'];
  if (issues.length === 0) {
    status = 'success';
  } else if (input.feedback.success) {
    status = 'partial';
  } else {
    status = 'failed';
  }

  // Determine action
  let action: FeedbackAnalysis['recommendations']['action'];
  let reasoning: string;

  if (status === 'success') {
    action = 'continue';
    reasoning = 'All commands executed successfully';
  } else if (input.attemptNumber >= 3) {
    action = 'abort';
    reasoning = 'Maximum retry attempts reached';
  } else if (status === 'failed') {
    action = 'retry';
    reasoning = 'Command execution failed, retrying';
  } else {
    action = 'refine';
    reasoning = 'Partial success, refining commands';
  }

  return {
    status,
    issues,
    recommendations: {
      action,
      reasoning,
    },
  };
}
