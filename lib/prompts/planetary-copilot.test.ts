import {
    formatGeographicalContext,
    formatExperienceIntegration,
    assembleEnvironmentalIntelligencePrompt,
    GeographicalContextData,
    ExperienceIntegrationData,
    PLANETARY_COPILOT_CORE_IDENTITY, // For checking identity parts
    ENVIRONMENTAL_INTELLIGENCE_AGENT_STATIC_PROMPT // For checking static prompt part
} from './planetary-copilot';

describe('Prompt Formatting and Assembly in planetary-copilot', () => {
    const mockGeoData: GeographicalContextData = {
        LOCATION_DESCRIPTION: "Test Location",
        TERRAIN_FEATURES: "Test Terrain",
        CLIMATE_CLASSIFICATION: "Test Climate",
        SEASONAL_FACTORS: "Test Season"
    };

    const mockExperienceData: ExperienceIntegrationData = {
        PROVEN_APPROACHES: "Test Approach",
        KNOWN_OBSTACLES: "Test Obstacle",
        IMPROVEMENT_AREAS: "Test Improvement"
    };

    test('formatGeographicalContext should correctly format data', () => {
        const result = formatGeographicalContext(mockGeoData);
        expect(result).toContain("Current geographical context: Test Location");
        expect(result).toContain("Local features: Test Terrain");
        expect(result).toContain("Climate zone: Test Climate");
        expect(result).toContain("Seasonal considerations: Test Season");
    });

    test('formatExperienceIntegration should correctly format data', () => {
        const result = formatExperienceIntegration(mockExperienceData);
        expect(result).toContain("- Successful strategies: Test Approach");
        expect(result).toContain("- Identified challenges: Test Obstacle");
        expect(result).toContain("- Optimization opportunities: Test Improvement");
    });

    test('assembleEnvironmentalIntelligencePrompt should combine all parts correctly', () => {
        const result = assembleEnvironmentalIntelligencePrompt(mockGeoData, mockExperienceData);

        // Check for identity
        expect(result).toContain(`Role: ${PLANETARY_COPILOT_CORE_IDENTITY.role}`);
        expect(result).toContain(`Mission: ${PLANETARY_COPILOT_CORE_IDENTITY.mission}`);
        expect(result).toContain(`Core Capabilities: ${PLANETARY_COPILOT_CORE_IDENTITY.core_capabilities.join(', ')}`);

        // Check for static prompt
        expect(result).toContain(ENVIRONMENTAL_INTELLIGENCE_AGENT_STATIC_PROMPT);

        // Check for geographical context (via a snippet from mockGeoData)
        // These are already checked by formatGeographicalContext test, but good for integration check
        expect(result).toContain("Current geographical context: Test Location");
        expect(result).toContain("Local features: Test Terrain");

        // Check for experience integration (via a snippet from mockExperienceData)
        // These are already checked by formatExperienceIntegration test, but good for integration check
        expect(result).toContain("- Successful strategies: Test Approach");
        expect(result).toContain("- Identified challenges: Test Obstacle");

        // Check for overall structure (e.g., presence of newlines between sections)
        // The prompt structure is Identity\n\nStaticPrompt\n\nGeoContext\n\nExperienceContext
        // So, splitting by "\n\n" should give at least 4 main parts.
        // The identity itself also has newlines.
        // A more robust check might be to count specific separators or match larger template blocks.
        const mainSections = result.split('\n\n');
        expect(mainSections.length).toBeGreaterThanOrEqual(4);

        // Verify that each major component is present
        expect(result).toMatch(/Identity:/);
        expect(result).toMatch(/CORE RESPONSIBILITIES:/); // from ENVIRONMENTAL_INTELLIGENCE_AGENT_STATIC_PROMPT
        expect(result).toMatch(/Current geographical context:/); // from DYNAMIC_CONTEXT_ENHANCER.geographical_context
        expect(result).toMatch(/Based on previous exploration outcomes:/); // from LEARNING_ENHANCEMENT.experience_integration
    });
});
