import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
  
  // Reset global game engine state to prevent test pollution
  if (typeof window === 'undefined') {
    // Only do this in Node.js environment (not jsdom)
    import('../app/engine/game-engine').then(({ gameEngine }) => {
      gameEngine.resetGame();
    }).catch(() => {
      // Ignore errors if the module can't be imported
    });
  }
});