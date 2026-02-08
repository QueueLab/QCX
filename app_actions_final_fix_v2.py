import os

def final_fix():
    with open('app/actions.tsx', 'r') as f:
        lines = f.readlines()

    new_lines = []
    skip_until = -1
    for i, line in enumerate(lines):
        if i < skip_until:
            continue

        # Look for the broken block
        if '    if (m.role === "user" && Array.isArray(m.content)) {' in line and i > 300:
            # We found the start of the block to delete
            # We need to skip until the end of the block '  });'
            for j in range(i, i + 20):
                if '  });' in lines[j]:
                    skip_until = j + 1
                    break
            continue

        new_lines.append(line)

    with open('app/actions.tsx', 'w') as f:
        f.writelines(new_lines)

if __name__ == "__main__":
    final_fix()
