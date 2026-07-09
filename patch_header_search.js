const fs = require('fs');
let content = fs.readFileSync('components/header-search-button.tsx', 'utf8');

const regex = /const mobileButton = \([\s\S]*?<\/Button>\n  \)/;
const replacement = `const mobileButton = (
    <Button variant="ghost" size="icon" onClick={handleResolutionSearch} disabled={isAnalyzing || !map || !actions} data-testid="mobile-search-button">
      {isAnalyzing ? (
        <div className="h-[1.2rem] w-[1.2rem] animate-spin rounded-full border-b-2 border-current"></div>
      ) : (
        <Search className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      )}
    </Button>
  )`;

content = content.replace(regex, replacement);
fs.writeFileSync('components/header-search-button.tsx', content);
