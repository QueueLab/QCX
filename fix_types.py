import sys

with open('lib/agents/resolution-search.tsx', 'r') as f:
    content = f.read()

old_vars = """  let finalSummary = '';
  let finalCogInfo = undefined;
  let finalNewsContext = undefined;
  let finalExtractedCoordinates = undefined;"""

new_vars = """  let finalSummary = '';
  let finalCogInfo: z.infer<typeof resolutionSearchSchema>['cogInfo'] = undefined;
  let finalNewsContext: z.infer<typeof resolutionSearchSchema>['newsContext'] = undefined;
  let finalExtractedCoordinates: z.infer<typeof resolutionSearchSchema>['extractedCoordinates'] = undefined;"""

content = content.replace(old_vars, new_vars)

with open('lib/agents/resolution-search.tsx', 'w') as f:
    f.write(content)
