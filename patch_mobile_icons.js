const fs = require('fs');
let content = fs.readFileSync('components/mobile-icons-bar.tsx', 'utf8');

const searchButtonRegex = /<Button variant="ghost" size="icon" data-testid="mobile-search-button">[\s\S]*?<\/Button>/;
content = content.replace(searchButtonRegex, '<div id="mobile-header-search-portal" className="contents" />');

fs.writeFileSync('components/mobile-icons-bar.tsx', content);
