import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const promptsPath = path.join(process.cwd(), 'lib/data/example-prompts.md');
    const fileContent = fs.readFileSync(promptsPath, 'utf8');
    const prompts = fileContent
      .split('- heading:')
      .slice(1)
      .map(block => {
        const headingMatch = block.match(/"(.*?)"/);
        const messageMatch = block.match(/message: "(.*?)"/);
        const iconMatch = block.match(/icon: "(.*?)"/);

        return {
          heading: headingMatch ? headingMatch[1] : '',
          message: messageMatch ? messageMatch[1] : '',
          icon: iconMatch ? iconMatch[1] : '',
        };
      });
    return NextResponse.json(prompts);
  } catch (error: any) {
    console.error('Error processing prompts:', error);
    return NextResponse.json({ error: 'Failed to process prompts', message: error.message }, { status: 500 });
  }
}
