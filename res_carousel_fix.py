import os

def fix_res_carousel():
    with open('components/resolution-carousel.tsx', 'r') as f:
        content = f.read()

    # Add isQCX to handleQCXAnalysis
    content = content.replace(
        "formData.append('action', 'resolution_search')",
        "formData.append('action', 'resolution_search')\n      formData.append('isQCX', 'true')"
    )

    with open('components/resolution-carousel.tsx', 'w') as f:
        f.write(content)

if __name__ == "__main__":
    fix_res_carousel()
