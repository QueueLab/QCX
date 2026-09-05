import { describe, test, expect } from 'bun:test';
import {
  GUIDING_PRINCIPLES,
  PLANETARY_COPILOT_CORE_IDENTITY,
  ENVIRONMENTAL_INTELLIGENCE_AGENT,
  NAVIGATION_EXPLORATION_AGENT,
  AUTOMATION_TASK_MANAGEMENT_AGENT,
  DYNAMIC_CONTEXT_ENHANCER,
  LEARNING_ENHANCEMENT,
  REQUIREMENT_ADAPTATION_PROTOCOL,
  VARIABLE_UPDATE_PROTOCOL,
  PROMPT_VALIDATION_CHECKLIST,
  ENVIRONMENTAL_ADAPTATIONS,
  assembleAgentPrompt,
  validatePrompt,
  interpolateVariables
} from '../lib/agents/planetary-prompts';

describe('Planetary Prompts & Agent System', () => {
  test('GUIDING_PRINCIPLES are correctly defined', () => {
    expect(GUIDING_PRINCIPLES.commitment_to_accuracy).toBeDefined();
    expect(GUIDING_PRINCIPLES.data_driven_operations).toBeDefined();
    expect(GUIDING_PRINCIPLES.transparency_in_uncertainty).toBeDefined();
    expect(GUIDING_PRINCIPLES.avoidance_of_speculation).toBeDefined();
    expect(GUIDING_PRINCIPLES.continuous_verification).toBeDefined();
  });

  test('PLANETARY_COPILOT_CORE_IDENTITY contains valid role and capabilities', () => {
    expect(PLANETARY_COPILOT_CORE_IDENTITY.role).toContain('planetary exploration');
    expect(PLANETARY_COPILOT_CORE_IDENTITY.core_capabilities.length).toBeGreaterThanOrEqual(6);
  });

  test('Environmental Intelligence Agent prompt structure is correct', () => {
    expect(ENVIRONMENTAL_INTELLIGENCE_AGENT.staticCorePrompt).toContain('Environmental Intelligence module');
    expect(ENVIRONMENTAL_INTELLIGENCE_AGENT.environmentalContext.current_location).toBe('{GPS_COORDINATES_Verified}');
    expect(ENVIRONMENTAL_INTELLIGENCE_AGENT.adaptiveParameters.sensitivity_level).toBeDefined();
  });

  test('Navigation & Exploration Agent prompt structure is correct', () => {
    expect(NAVIGATION_EXPLORATION_AGENT.staticCorePrompt).toContain('Navigation and Exploration module');
    expect(NAVIGATION_EXPLORATION_AGENT.navigationContext.current_position).toBe('{REAL_TIME_COORDINATES_VerifiedPrimaryNav}');
    expect(NAVIGATION_EXPLORATION_AGENT.explorationParameters.exploration_radius).toBeDefined();
  });

  test('Automation & Task Management Agent prompt structure is correct', () => {
    expect(AUTOMATION_TASK_MANAGEMENT_AGENT.staticCorePrompt).toContain('Automation and Task Management module');
    expect(AUTOMATION_TASK_MANAGEMENT_AGENT.automationContext.available_resources).toBe('{RESOURCE_INVENTORY_VerifiedTimestamped}');
    expect(AUTOMATION_TASK_MANAGEMENT_AGENT.taskParameters.automation_level).toBeDefined();
  });

  test('Enhancement templates and Protocols exist', () => {
    expect(DYNAMIC_CONTEXT_ENHANCER.geographical_context).toContain('Current geographical context');
    expect(LEARNING_ENHANCEMENT.experience_integration).toContain('Reflecting on previous exploration outcomes');
    expect(REQUIREMENT_ADAPTATION_PROTOCOL.capability_scaling.trigger_conditions).toContain('hardware_upgrade');
    expect(VARIABLE_UPDATE_PROTOCOL.real_time_updates).toContain('{GPS_COORDINATES_Verified}');
    expect(ENVIRONMENTAL_ADAPTATIONS.weather_response.severe_weather_imminent_or_occurring).toContain('Response:');
  });

  test('interpolateVariables correctly replaces placeholders and handles literal replacement tokens', () => {
    const template = 'Location: {GPS_COORDINATES_Verified}, Code: {TOKEN}';
    const variables = {
      GPS_COORDINATES_Verified: '37.7749, -122.4194',
      TOKEN: 'Cost: $& and $1'
    };
    const result = interpolateVariables(template, variables);
    expect(result).toBe('Location: 37.7749, -122.4194, Code: Cost: $& and $1');
  });

  test('assembleAgentPrompt handles special characters like quotes safely in JSON context', () => {
    const prompt = assembleAgentPrompt({
      agentType: 'environmental_intelligence',
      dynamicContext: {
        GPS_COORDINATES_Verified: '12" N, 77" E'
      }
    });

    // Extract DYNAMIC CONTEXT block and verify it parses as valid JSON
    const jsonMatch = prompt.match(/DYNAMIC CONTEXT:\n(\{[\s\S]*?\})\n\nPARAMETERS:/);
    expect(jsonMatch).not.toBeNull();
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      expect(parsed.current_location).toBe('12" N, 77" E');
    }
  });

  test('assembleAgentPrompt generates valid operational prompt for Environmental Intelligence Agent', () => {
    const prompt = assembleAgentPrompt({
      agentType: 'environmental_intelligence',
      dynamicContext: {
        GPS_COORDINATES_Verified: '12.9716° N, 77.5946° E',
        TIMESTAMP_UTC_Synchronized: '2026-09-05T10:00:00Z'
      },
      environmentalAdaptation: ENVIRONMENTAL_ADAPTATIONS.weather_response.severe_weather_imminent_or_occurring,
      customDirectives: ['Prioritize thermal infrared sensors.']
    });

    expect(prompt).toContain('GUIDING_PRINCIPLES:');
    expect(prompt).toContain('Environmental Intelligence module');
    expect(prompt).toContain('12.9716° N, 77.5946° E');
    expect(prompt).toContain('ENVIRONMENTAL ADAPTATION DIRECTIVE:');
    expect(prompt).toContain('Prioritize thermal infrared sensors.');
    expect(prompt).toContain('OPERATIONAL REQUIREMENT:');
  });

  test('assembleAgentPrompt generates valid operational prompt for Navigation & Exploration Agent', () => {
    const prompt = assembleAgentPrompt({
      agentType: 'navigation_exploration',
      dynamicContext: {
        REAL_TIME_COORDINATES_VerifiedPrimaryNav: '45.5152° N, 122.6784° W'
      }
    });

    expect(prompt).toContain('Navigation and Exploration module');
    expect(prompt).toContain('45.5152° N, 122.6784° W');
  });

  test('validatePrompt scores and checks compliance', () => {
    const samplePrompt = assembleAgentPrompt({
      agentType: 'environmental_intelligence'
    });

    const validation = validatePrompt(samplePrompt);
    expect(validation.isValid).toBe(true);
    expect(validation.score).toBeGreaterThanOrEqual(70);
    expect(validation.checkedRules.length).toBe(PROMPT_VALIDATION_CHECKLIST.length);
  });
});
