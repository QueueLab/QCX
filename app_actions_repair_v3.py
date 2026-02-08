import os

def repair():
    with open('app/actions.tsx', 'r') as f:
        lines = f.readlines()

    # Correcting the missing mapping start at line ~337
    # Line 336 index 335
    if '    if (m.role === "user" && Array.isArray(m.content)) {' in lines[336]:
         lines[336] = '  const sanitizedHistory = currentMessages.map((m: any) => {\n' + lines[336]

    with open('app/actions.tsx', 'w') as f:
        f.writelines(lines)

if __name__ == "__main__":
    repair()
