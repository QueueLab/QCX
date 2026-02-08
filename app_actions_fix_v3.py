import os

def fix_app_actions():
    with open('app/actions.tsx', 'r') as f:
        lines = f.readlines()

    # Line 244 is index 243
    if '...sanitizedHistory,' in lines[243]:
        lines[243] = lines[243].replace('...sanitizedHistory,', '...aiState.get().messages,')

    with open('app/actions.tsx', 'w') as f:
        f.writelines(lines)

if __name__ == "__main__":
    fix_app_actions()
