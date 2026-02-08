import re

def sync_app_actions():
    with open('app/actions.tsx', 'r') as f:
        content = f.read()

    # Find where messages is defined in main flow
    marker = 'return m\n  })'

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

    if 'const sanitizedHistory =' not in content[300:]:
        content = content.replace(marker, marker + sanitization_code)

    with open('app/actions.tsx', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    sync_app_actions()
