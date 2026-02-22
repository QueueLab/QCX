import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Global initialization can be added here
  // For example, clearing a test database or setting up environment variables
  console.log('Starting E2E test suite...');
}

export default globalSetup;
