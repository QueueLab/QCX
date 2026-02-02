'use server';

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

const modelConfigPath = path.resolve(process.cwd(), 'config', 'model.json');

export async function getSelectedModel(): Promise<string | null> {
  noStore();
  try {
    const data = await fs.readFile(modelConfigPath, 'utf8');
    const config = JSON.parse(data);
    return config.selectedModel || null;
  } catch (error) {
    console.error('Error reading model config:', error);
    return null;
  }
}

export async function saveSelectedModel(model: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = JSON.stringify({ selectedModel: model }, null, 2);
    await fs.mkdir(path.dirname(modelConfigPath), { recursive: true });
    await fs.writeFile(modelConfigPath, data, 'utf8');
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error saving model config:', error);
    return { success: false, error: 'Failed to save selected model.' };
  }
}
