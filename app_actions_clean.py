import re

def clean_app_actions():
    with open('app/actions.tsx', 'r') as f:
        content = f.read()

    # Find the terra block and remove duplicate sanitization
    # It currently looks like:
    # if (userInput && ...) {
    #   const currentMessagesBefore = ...
    #   const sanitizedHistoryBefore = ...
    #   const definition = ...
    #   const content = ...
    #   const currentMessagesBefore = ... (DUPLICATE)

    # Let's use a more surgical approach.
    # Replace the whole terra block with a clean version.

    terra_block_pattern = r"if \(userInput && \(userInput\.toLowerCase\(\)\.trim\(\) === 'what is a planet computer\?' \|\| userInput\.toLowerCase\(\)\.trim\(\) === 'what is qcx-terra\?'\)\) \{.*?aiState\.done\(\{.*?\}\);"

    # Actually, I'll just look for the double definition of currentMessagesBefore
    content = content.replace(
        '    const currentMessagesBefore = aiState.get().messages;\n    const sanitizedHistoryBefore = currentMessagesBefore.map((m: any) => {\n      if (m.role === "user" && Array.isArray(m.content)) {\n        return {\n          ...m,\n          content: m.content.map((part: any) =>\n            part.type === "image" ? { ...part, image: "IMAGE_PROCESSED" } : part\n          )\n        }\n      }\n      return m\n    });\n    aiState.update({',
        'aiState.update({'
    )

    # Wait, I want to keep ONE of them.
    # Re-reading the file...

    with open('app/actions.tsx', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    clean_app_actions()
