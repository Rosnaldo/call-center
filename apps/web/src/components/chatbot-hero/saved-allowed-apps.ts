import type { PopularApp } from './popular-apps.ts';

// The allowed apps last sent from the checklist, kept in the browser so the
// next checklist starts with them checked. Name and icon are kept too, so apps
// picked from a search still show without searching again.
const STORAGE_KEY = 'chatbot.allowedApps';

const isSavedApp = (value: unknown): value is PopularApp => {
  const app = value as PopularApp;
  return typeof app?.id === 'string' && typeof app.name === 'string' && typeof app.iconUrl === 'string';
};

// Storage can be blocked (private mode, disabled site data) or hold anything.
export const loadSavedApps = (): PopularApp[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter(isSavedApp) : [];
  } catch {
    return [];
  }
};

export const saveApps = (apps: PopularApp[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps.map(({ id, name, iconUrl }) => ({ id, name, iconUrl }))));
  } catch {
    // Not saved; the checklist just starts empty next time.
  }
};
