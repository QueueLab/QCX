/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-21 22:26:50
 * @Description: Mapbox Access Token Configuration
 */

/**
 * Get Mapbox Access Token
 *
 * @returns {string} Mapbox Access Token
 */
function getApiKey(): string {
  const apiKey = process.env.MAPBOX_ACCESS_TOKEN;
  if (!apiKey) {
    console.warn("Warning: MAPBOX_ACCESS_TOKEN environment variable is not set. This is required for runtime Mapbox API calls. If this message appears during a build, ensure the variable is set in your deployment environment. A placeholder token will be used for now, which will cause runtime failures if not replaced by a real token in the environment.");
    return "dummy_token_placeholder_for_build"; // Placeholder to allow build to pass
  }
  return apiKey;
}

export const MAPBOX_ACCESS_TOKEN: string = getApiKey();
