import { describe, it, expect } from 'vitest';
import { POPULAR_APPS, POPULAR_CATEGORIES } from '../popular-apps.ts';

const MAX_APPS_PER_CATEGORY = 6;

describe('popular apps', () => {
  it(`keeps at most ${MAX_APPS_PER_CATEGORY} apps per category`, () => {
    for (const category of POPULAR_CATEGORIES) {
      expect(category.apps.length, category.name).toBeLessThanOrEqual(MAX_APPS_PER_CATEGORY);
    }
  });

  it('lists each category once and each app once', () => {
    const names = POPULAR_CATEGORIES.map((category) => category.name);
    expect(new Set(names).size).toBe(names.length);
    const ids = POPULAR_APPS.map((app) => app.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
