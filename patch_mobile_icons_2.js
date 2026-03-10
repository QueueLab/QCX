const fs = require('fs');
let content = fs.readFileSync('components/mobile-icons-bar.tsx', 'utf8');

// We need to add imports if they are missing
if (!content.includes('useUsageToggle')) {
    content = content.replace("import { useCalendarToggle } from './calendar-toggle-context'", "import { useCalendarToggle } from './calendar-toggle-context'\nimport { useUsageToggle } from './usage-toggle-context'\nimport { useProfileToggle } from './profile-toggle-context'");
}

// And we need to add the hooks inside the component
if (!content.includes('const { toggleUsage, isUsageOpen } = useUsageToggle()')) {
    content = content.replace("const { toggleCalendar } = useCalendarToggle()", "const { toggleCalendar } = useCalendarToggle()\n  const { toggleUsage, isUsageOpen } = useUsageToggle()\n  const { activeView, closeProfileView } = useProfileToggle()\n\n  const handleUsageToggle = () => {\n    // If we're about to open usage and profile is open, close profile first\n    if (!isUsageOpen && activeView) {\n      closeProfileView()\n    }\n    toggleUsage()\n  }");
}

const linkRegex = /<a href="https:\/\/buy\.stripe\.com\/14A3cv7K72TR3go14Nasg02" target="_blank" rel="noopener noreferrer">[\s\S]*?<\/a>/;
const replacement = `<Button variant="ghost" size="icon" onClick={handleUsageToggle}>
        <TentTree className="h-[1.2rem] w-[1.2rem] transition-all rotate-0 scale-100" />
      </Button>`;

content = content.replace(linkRegex, replacement);

// The `useProfileToggle` was actually already imported?
// Let's remove duplicate imports just in case.

fs.writeFileSync('components/mobile-icons-bar.tsx', content);
