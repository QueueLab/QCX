import os

def sync_app_actions():
    with open('app/actions.tsx', 'r') as f:
        lines = f.readlines()

    new_lines = []
    found_messages_def = False
    for i, line in enumerate(lines):
        new_lines.append(line)
        if 'messages.splice(0, Math.max(messages.length - maxMessages, 0))' in line:
            found_messages_def = True
            new_lines.append('\n')
            new_lines.append('  const currentMessages = aiState.get().messages;\n')
            new_lines.append('  const sanitizedHistory = currentMessages.map((m: any) => {\n')
            new_lines.append('    if (m.role === "user" && Array.isArray(m.content)) {\n')
            new_lines.append('      return {\n')
            new_lines.append('        ...m,\n')
            new_lines.append('        content: m.content.map((part: any) =>\n')
            new_lines.append('          part.type === "image" ? { ...part, image: "IMAGE_PROCESSED" } : part\n')
            new_lines.append('        )\n')
            new_lines.append('      }\n')
            new_lines.append('    }\n')
            new_lines.append('    return m\n')
            new_lines.append('  });\n')

    if found_messages_def:
        with open('app/actions.tsx', 'w') as f:
            f.writelines(new_lines)
    else:
        print("Failed to find insertion point")

if __name__ == "__main__":
    sync_app_actions()
