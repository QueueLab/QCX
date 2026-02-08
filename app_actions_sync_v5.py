import os

def sync_app_actions():
    with open('app/actions.tsx', 'r') as f:
        lines = f.readlines()

    # 1. Remove all old sanitizedHistoryBefore and sanitizedHistory definitions
    # and usages to start fresh
    new_lines = []
    found_submit = False
    added_sanitization = False

    for line in lines:
        if 'async function submit(formData?: FormData, skip?: boolean) {' in line:
            found_submit = True
            new_lines.append(line)
            continue

        if found_submit and not added_sanitization:
            # Add it right after 'use server'
            if "'use server'" in line:
                new_lines.append(line)
                new_lines.append('\n')
                new_lines.append('  const aiState = getMutableAIState<typeof AI>()\n')
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
                added_sanitization = True
                continue

        # Skip existing definitions of aiState (already added one at the top)
        if 'const aiState = getMutableAIState<typeof AI>()' in line and added_sanitization:
            continue

        # Skip other sanitization definitions
        if 'const sanitizedHistory =' in line or 'const sanitizedHistoryBefore =' in line:
            continue
        if 'const currentMessages =' in line or 'const currentMessagesBefore =' in line:
            continue

        new_lines.append(line)

    # Now replace usages of ...aiState.get().messages and ...sanitizedHistoryBefore with ...sanitizedHistory
    final_lines = []
    for line in new_lines:
        line = line.replace('...aiState.get().messages,', '...sanitizedHistory,')
        line = line.replace('...sanitizedHistoryBefore,', '...sanitizedHistory,')
        final_lines.append(line)

    with open('app/actions.tsx', 'w') as f:
        f.writelines(final_lines)

if __name__ == "__main__":
    sync_app_actions()
