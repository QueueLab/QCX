import re
import os

def sync_app_actions():
    with open('app/actions.tsx', 'r') as f:
        content = f.read()

    # 1. Define a helper function string for sanitization to avoid repeating logic
    # Actually, let's just define it inline since we are in a single file and it's a Server Action.

    sanitization_logic = """
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

    # 2. Update the resolution search block (lines ~91-98)
    # It currently uses ...aiState.get().messages,
    content = content.replace(
        "aiState.update({\n      ...aiState.get(),\n      messages: [\n        ...aiState.get().messages,",
        "const currentMessagesBefore = aiState.get().messages;\n    const sanitizedHistoryBefore = currentMessagesBefore.map((m: any) => {\n      if (m.role === \"user\" && Array.isArray(m.content)) {\n        return {\n          ...m,\n          content: m.content.map((part: any) =>\n            part.type === \"image\" ? { ...part, image: \"IMAGE_PROCESSED\" } : part\n          )\n        }\n      }\n      return m\n    });\n    aiState.update({\n      ...aiState.get(),\n      messages: [\n        ...sanitizedHistoryBefore,"
    )

    # 3. Update the terra/planet computer block (lines ~241-253 and 267-279)
    # Replace ...aiState.get().messages, with ...sanitizedHistoryBefore, (re-using the logic)

    # We need to find the block for "what is a planet computer?"
    terra_pattern = r"(if \(userInput && \(userInput\.toLowerCase\(\)\.trim\(\) === 'what is a planet computer\?' \|\| userInput\.toLowerCase\(\)\.trim\(\) === 'what is qcx-terra\?'\)\) \{)"
    content = re.sub(terra_pattern, r"\1\n    const currentMessagesBefore = aiState.get().messages;\n    const sanitizedHistoryBefore = currentMessagesBefore.map((m: any) => {\n      if (m.role === 'user' && Array.isArray(m.content)) {\n        return {\n          ...m,\n          content: m.content.map((part: any) =>\n            part.type === 'image' ? { ...part, image: 'IMAGE_PROCESSED' } : part\n          )\n        }\n      }\n      return m\n    });", content)

    # Now replace the usages in that block
    content = content.replace(
        "messages: [\n        ...aiState.get().messages,\n        {\n          id: nanoid(),\n          role: 'user',\n          content,\n          type,",
        "messages: [\n        ...sanitizedHistoryBefore,\n        {\n          id: nanoid(),\n          role: 'user',\n          content,\n          type,"
    )

    content = content.replace(
        "aiState.done({\n      ...aiState.get(),\n      messages: [\n        ...aiState.get().messages,",
        "aiState.done({\n      ...aiState.get(),\n      messages: [\n        ...sanitizedHistoryBefore,"
    )

    with open('app/actions.tsx', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    sync_app_actions()
