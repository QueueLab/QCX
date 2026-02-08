import re

def repair():
    with open('app/actions.tsx', 'r') as f:
        content = f.read()

    # Repair the terra block
    broken_terra = """  if (userInput && (userInput.toLowerCase().trim() === 'what is a planet computer?' || userInput.toLowerCase().trim() === 'what is qcx-terra?')) {
      if (m.role === 'user' && Array.isArray(m.content)) {"""

    fixed_terra = """  if (userInput && (userInput.toLowerCase().trim() === 'what is a planet computer?' || userInput.toLowerCase().trim() === 'what is qcx-terra?')) {
    const definition = """

    # Wait, the definition was already there but the mapping was broken.

    # Actually, I don't need sanitizedHistory definition here anymore because it's at the top of submit!
    # So I just need to remove the leftover mapping code.

    leftover_mapping = """      if (m.role === 'user' && Array.isArray(m.content)) {
        return {
          ...m,
          content: m.content.map((part: any) =>
            part.type === 'image' ? { ...part, image: 'IMAGE_PROCESSED' } : part
          )
        }
      }
      return m
    });\n"""

    content = content.replace(leftover_mapping, "")

    with open('app/actions.tsx', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    repair()
