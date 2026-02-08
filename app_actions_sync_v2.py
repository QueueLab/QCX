import re

def sync_app_actions():
    with open('app/actions.tsx', 'r') as f:
        content = f.read()

    # Define sanitizedHistory in the main flow (around where messages is defined)
    # messages is defined at "const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter"

    sanitization_code = """
  const currentMessages = aiState.get().messages;
  const sanitizedHistory = currentMessages.map((m: any) => {
    if (m.role === "user" && Array.isArray(m.content)) {
      return {
        ...m,
        content: m.content.map((part: any) =>
          part.type === "image" ? { ...part, image: "IMAGE_PROCESSED" } : part
        )
      }
    }
    return m
  });
"""

    if 'const sanitizedHistory =' not in content[300:]: # Avoid duplicate if already there
        # Insert after the messages definition in main flow
        content = re.sub(r'(const messages: CoreMessage\[\] = .*?;)', r'\1' + sanitization_code, content)

    # Also add some logging to resolution_search
    log_code = "        console.log('[ResolutionSearch] Analysis result:', !!analysisResult.summary, !!analysisResult.geoJson);"
    content = content.replace("const analysisResult = await streamResult.object;", "const analysisResult = await streamResult.object;\n" + log_code)

    with open('app/actions.tsx', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    sync_app_actions()
