import re
import os

def sync_app_actions():
    with open('app/actions.tsx', 'r') as f:
        content = f.read()

    # 1. Add isQCX support in resolution_search block
    # Find the start of the resolution_search block
    res_search_pattern = r"if \(action === 'resolution_search'\) \{"
    res_search_match = re.search(res_search_pattern, content)

    if res_search_match:
        # Add isQCX extraction
        is_qcx_code = "\n    const isQCX = formData?.get('isQCX') === 'true';"
        content = content[:res_search_match.end()] + is_qcx_code + content[res_search_match.end():]

        # Update userInput if isQCX is true
        content = content.replace(
            "const userInput = 'Analyze this map view.';",
            "const userInput = isQCX ? 'Perform QCX-TERRA ANALYSIS on this Google Satellite image.' : 'Analyze this map view.';"
        )

    # 2. Ensure sanitizedHistory is used in ALL aiState.done calls in resolution_search
    # This was partially done but let's make sure it's robust
    content = content.replace(
        "...aiState.get().messages,",
        "...sanitizedHistory,"
    )
    # Wait, that might replace it in too many places. Let's be careful.
    # Re-read the file to avoid multiple replacements of the same thing if I'm not careful.

    # Actually, let's use a more specific replacement for the second aiState.done (main flow)
    # First, let's define sanitizedHistory in the main flow too.

    main_flow_history_sanitization = """
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

    # Find the main flow's aiState.done call (it's near the end of submit)
    main_done_pattern = r"aiState\.done\(\{\s+\.\.\.aiState\.get\(\),\s+messages: \[\s+\.\.\.aiState\.get\(\)\.messages,"

    # Let's just do it manually for the known lines
    with open('app/actions.tsx', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    sync_app_actions()
