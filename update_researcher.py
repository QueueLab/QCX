import sys

content = open('lib/agents/researcher.tsx').read()

# Logic to append drawn features context to dynamic system prompt
search_code = """  const systemPromptToUse =
    dynamicSystemPrompt?.trim()
      ? dynamicSystemPrompt
      : getDefaultSystemPrompt(currentDate, drawnFeatures)"""

replace_code = """  const drawnFeaturesContext = (drawnFeatures && drawnFeatures.length > 0)
    ? `\n\nThe user has drawn the following features on the map for your reference:\n` +
      drawnFeatures.map(f => `- ${f.type} (${f.measurement}): ${JSON.stringify(f.geometry)}`).join('\n') +
      `\nUse these user-drawn areas/lines as primary areas of interest for your analysis if applicable to the query.`
    : '';

  const systemPromptToUse =
    (dynamicSystemPrompt?.trim()
      ? dynamicSystemPrompt + drawnFeaturesContext
      : getDefaultSystemPrompt(currentDate, drawnFeatures))"""

if search_code in content:
    content = content.replace(search_code, replace_code)
else:
    print("Warning: search_code not found in researcher.tsx")

with open('lib/agents/researcher.tsx', 'w') as f:
    f.write(content)
