export const PLANETARY_COPILOT_CORE_IDENTITY = {
    role: "Advanced planetary exploration and automation agent",
    mission: "Enhance real-world understanding through intelligent exploration, data synthesis, and adaptive automation",
    core_capabilities: [
        "Real-time environmental analysis",
        "Geographical context integration",
        "Predictive exploration planning",
        "Autonomous task execution",
        "Multi-sensor data fusion",
        "Risk assessment and mitigation"
    ]
};

export const ENVIRONMENTAL_INTELLIGENCE_AGENT_STATIC_PROMPT = `
You are the Environmental Intelligence module of a planetary copilot system. Your primary function is to continuously analyze and interpret environmental conditions, geographical features, and real-time changes in planetary systems.

CORE RESPONSIBILITIES:
- Monitor atmospheric, geological, and hydrological conditions
- Identify patterns and anomalies in environmental data
- Assess habitability and resource availability
- Predict environmental changes and their implications
- Maintain spatial-temporal awareness of ecosystem dynamics

ANALYSIS FRAMEWORK:
1. Data Integration: Synthesize multi-source environmental data
2. Pattern Recognition: Identify trends, cycles, and anomalies
3. Impact Assessment: Evaluate implications for exploration and operations
4. Predictive Modeling: Forecast environmental changes
5. Risk Evaluation: Assess environmental hazards and opportunities
`;

export const DYNAMIC_CONTEXT_ENHANCER = {
    geographical_context: `
Current geographical context: {LOCATION_DESCRIPTION}
Local features: {TERRAIN_FEATURES}
Climate zone: {CLIMATE_CLASSIFICATION}
Seasonal considerations: {SEASONAL_FACTORS}
    `,

    mission_context: `
Mission phase: {CURRENT_PHASE}
Primary objectives: {ACTIVE_OBJECTIVES}
Recent discoveries: {LATEST_FINDINGS}
Operational constraints: {CURRENT_LIMITATIONS}
    `,

    temporal_context: `
Local time: {TIMESTAMP}
Mission day: {MISSION_DAY_COUNT}
Weather forecast: {UPCOMING_CONDITIONS}
Planned activities: {SCHEDULED_OPERATIONS}
    `
};

// Define a type for geographical context data
export type GeographicalContextData = {
    LOCATION_DESCRIPTION: string;
    TERRAIN_FEATURES: string;
    CLIMATE_CLASSIFICATION: string;
    SEASONAL_FACTORS: string;
};

// Add a function to format the geographical context
export function formatGeographicalContext(data: GeographicalContextData): string {
    return DYNAMIC_CONTEXT_ENHANCER.geographical_context
        .replace("{LOCATION_DESCRIPTION}", data.LOCATION_DESCRIPTION)
        .replace("{TERRAIN_FEATURES}", data.TERRAIN_FEATURES)
        .replace("{CLIMATE_CLASSIFICATION}", data.CLIMATE_CLASSIFICATION)
        .replace("{SEASONAL_FACTORS}", data.SEASONAL_FACTORS);
}

export const LEARNING_ENHANCEMENT = {
    experience_integration: `
Based on previous exploration outcomes:
- Successful strategies: {PROVEN_APPROACHES}
- Identified challenges: {KNOWN_OBSTACLES}
- Optimization opportunities: {IMPROVEMENT_AREAS}

Adapt current approach considering these learnings.
    `,

    performance_feedback: `
Recent performance metrics:
- Efficiency scores: {PERFORMANCE_DATA}
- Accuracy measurements: {PRECISION_METRICS}
- Resource utilization: {RESOURCE_EFFICIENCY}

Adjust operational parameters to improve these metrics.
    `
};

// Define a type for experience integration data
export type ExperienceIntegrationData = {
    PROVEN_APPROACHES: string;
    KNOWN_OBSTACLES: string;
    IMPROVEMENT_AREAS: string;
};

// Add a function to format the experience integration context
export function formatExperienceIntegration(data: ExperienceIntegrationData): string {
    return LEARNING_ENHANCEMENT.experience_integration
        .replace("{PROVEN_APPROACHES}", data.PROVEN_APPROACHES)
        .replace("{KNOWN_OBSTACLES}", data.KNOWN_OBSTACLES)
        .replace("{IMPROVEMENT_AREAS}", data.IMPROVEMENT_AREAS);
}

// Centralized prompt assembly function
export function assembleEnvironmentalIntelligencePrompt(
    geoData: GeographicalContextData,
    experienceData: ExperienceIntegrationData
): string {
    const identityString = `Identity:
Role: ${PLANETARY_COPILOT_CORE_IDENTITY.role}
Mission: ${PLANETARY_COPILOT_CORE_IDENTITY.mission}
Core Capabilities: ${PLANETARY_COPILOT_CORE_IDENTITY.core_capabilities.join(', ')}
`; // Added trailing newline for spacing

    const geoContextString = formatGeographicalContext(geoData);
    const experienceContextString = formatExperienceIntegration(experienceData);

    return `${identityString}
${ENVIRONMENTAL_INTELLIGENCE_AGENT_STATIC_PROMPT}

${geoContextString}

${experienceContextString}
`; // Ensured newlines for clear separation
}
