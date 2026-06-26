with open('app/actions.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip_next = False
for i, line in enumerate(lines):
    if 'const aiState = getMutableAIState<typeof AI>()' in line:
        if i > 0 and 'const userId =' in lines[i-1]:
            new_lines.append(line)
            continue
        else:
            # This is the second one, let's keep it but maybe it missed uiStream
            # Actually let's just rewrite the whole block
            continue
    if 'const isGenerating = createStreamableValue(true)' in line:
        new_lines.append("  const uiStream = createStreamableUI()\n")
        new_lines.append(line)
        continue
    new_lines.append(line)

with open('app/actions.tsx', 'w') as f:
    f.writelines(new_lines)
