import re

def repair():
    with open('app/actions.tsx', 'r') as f:
        content = f.read()

    # Repair the resolution search block
    # It had a sanitizedMessages mapping that got messed up
    pattern = r'const sanitizedMessages: CoreMessage\[\] = messages\.map\(\(m: any\) => \{.*?return m\n\s+\}\)\n\n\s+if \(m\.role === "user" && Array\.isArray\(m\.content\)\) \{.*?return m\n\s+\}\);'

    # Let's find the specific block
    # It starts around "const sanitizedMessages" and ends before "const relatedQueries"

    # I'll just use string replacement for the broken part
    broken_part = """          return m
        })

          if (m.role === \"user\" && Array.isArray(m.content)) {
            return {
              ...m,
              content: m.content.map((part: any) =>
                part.type === \"image\" ? { ...part, image: \"IMAGE_PROCESSED\" } : part
              )
            }
          }
          return m
        });"""

    fixed_part = """          return m
        })"""

    content = content.replace(broken_part, fixed_part)

    # Also look for any other remnants of my bad script
    content = content.replace('});\n        });', '});')

    with open('app/actions.tsx', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    repair()
