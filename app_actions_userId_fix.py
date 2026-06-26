import re

with open('app/actions.tsx', 'r') as f:
    content = f.read()

# 1. Update AIState
if 'userId?: string' not in content:
    content = content.replace('isSharePage?: boolean', 'isSharePage?: boolean\n  userId?: string')

if 'userId: undefined' not in content:
    content = content.replace('messages: []', 'messages: [],\n  userId: undefined as string | undefined')

# 2. Update submit function
# Find the start of submit
submit_start = content.find('async function submit(formData?: FormData, skip?: boolean) {')
if submit_start != -1:
    # Look for getCurrentUserIdOnServer call within submit
    # Actually, let's just insert it at the beginning of submit body
    use_server_pos = content.find("'use server'", submit_start)
    if use_server_pos != -1:
        insert_pos = content.find('\n', use_server_pos) + 1
        # Check if already inserted
        if 'const userId = await getCurrentUserIdOnServer();' not in content[insert_pos:insert_pos+200]:
            content = content[:insert_pos] + "  const userId = await getCurrentUserIdOnServer();\n  const aiState = getMutableAIState<typeof AI>()\n  if (userId && aiState.get().userId !== userId) {\n    aiState.update({\n      ...aiState.get(),\n      userId\n    })\n  }\n" + content[insert_pos:]

# 3. Remove old userId resolution
old_res_pattern = r'const \{ getCurrentUserIdOnServer \} = await import\(\s+"@/lib/auth/get-current-user"\s+\)\s+const userId = \(await getCurrentUserIdOnServer\(\)\) \|\| "anonymous";'
content = re.sub(old_res_pattern, '', content)

# 4. Update onSetAIState
old_onset_pattern = r'const \{ getCurrentUserIdOnServer \} = await import\(\s+"@/lib/auth/get-current-user"\s+\)\s+const actualUserId = await getCurrentUserIdOnServer\(\)'
content = re.sub(old_onset_pattern, 'const actualUserId = state.userId', content)

# 5. Update error log in onSetAIState
content = content.replace("console.error('onSetAIState: User not authenticated. Chat not saved.')", "console.info('onSetAIState: User not authenticated. Chat not saved.')")

with open('app/actions.tsx', 'w') as f:
    f.write(content)
