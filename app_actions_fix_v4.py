import os

def fix_app_actions():
    with open('app/actions.tsx', 'r') as f:
        lines = f.readlines()

    # Line 270 is index 269
    if '...sanitizedHistory,' in lines[269]:
        lines[269] = lines[269].replace('...sanitizedHistory,', '...aiState.get().messages,')

    with open('app/actions.tsx', 'w') as f:
        f.writelines(lines)

if __name__ == "__main__":
    fix_app_actions()
