import re

def fix_app_actions():
    with open('app/actions.tsx', 'r') as f:
        content = f.read()

    # Find the resolution search block's aiState.done
    # It follows processResolutionSearch and is inside the try block
    pattern = r'(aiState\.done\(\{.*?messages: \[)\s+\.\.\.aiState\.get\(\)\.messages,'
    # But wait, there are multiple aiState.done calls.
    # I want the one inside processResolutionSearch.

    # Let's search for the whole block
    content = content.replace('...aiState.get().messages,\n            {\n              id: groupeId,\n              role: \'assistant\',\n              content: analysisResult.summary',
                              '...sanitizedHistory,\n            {\n              id: groupeId,\n              role: \'assistant\',\n              content: analysisResult.summary')

    with open('app/actions.tsx', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    fix_app_actions()
