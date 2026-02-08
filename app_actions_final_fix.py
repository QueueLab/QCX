import os

def final_fix():
    with open('app/actions.tsx', 'r') as f:
        lines = f.readlines()

    new_lines = []
    for i, line in enumerate(lines):
        # Remove redeclaration of sanitizedHistory at line 337
        if 'const sanitizedHistory = currentMessages.map' in line and i > 300:
            continue

        # Restore aiState in clearChat
        if 'async function clearChat() {' in line:
            new_lines.append(line)
            new_lines.append("  'use server'\n")
            new_lines.append('\n')
            new_lines.append('  const aiState = getMutableAIState<typeof AI>()\n')
            continue

        # Skip the second 'use server' if duplicated by my previous bad logic
        if "'use server'" in line and i > 560 and i < 570:
             continue

        new_lines.append(line)

    with open('app/actions.tsx', 'w') as f:
        f.writelines(new_lines)

if __name__ == "__main__":
    final_fix()
