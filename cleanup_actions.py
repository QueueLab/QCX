import sys

content = open('app/actions.tsx').read()

# Remove the redundant drawnFeatures extraction inside the resolution_search block
pattern = """    const drawnFeaturesString = formData?.get('drawnFeatures') as string;
    let drawnFeatures: DrawnFeature[] = [];
    try {
      drawnFeatures = drawnFeaturesString ? JSON.parse(drawnFeaturesString) : [];
    } catch (e) {
      console.error('Failed to parse drawnFeatures:', e);
    }"""

# Find the second occurrence (the one inside the block)
first_occ = content.find(pattern)
if first_occ != -1:
    second_occ = content.find(pattern, first_occ + len(pattern))
    if second_occ != -1:
        # We want to keep the one AT THE TOP of submit, but remove the one in the block
        content = content[:second_occ] + content[second_occ + len(pattern):]

with open('app/actions.tsx', 'w') as f:
    f.write(content)
