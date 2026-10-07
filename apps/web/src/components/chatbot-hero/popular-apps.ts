import popularApps from './popular-apps.json';

export interface PopularApp {
  name: string;
  // Google Play app id (play.google.com/store/apps/details?id=<id>).
  id: string;
  // Icon from Google Play, the same source as the search results.
  // Refresh with `npm run refresh-popular-apps` in apps/chatbot.
  iconUrl: string;
}

export interface PopularAppCategory {
  name: string;
  apps: PopularApp[];
}

// Options of the allowed apps checklist, in checklist order. The JSON is
// ordered by category; each app names its own category.
export const POPULAR_APPS: PopularApp[] = popularApps.map(({ name, id, iconUrl }) => ({ name, id, iconUrl }));

export const POPULAR_CATEGORIES: PopularAppCategory[] = popularApps.reduce<PopularAppCategory[]>((categories, app) => {
  const { category, ...rest } = app;
  const last = categories.at(-1);
  if (last?.name === category) last.apps.push(rest);
  else categories.push({ name: category, apps: [rest] });
  return categories;
}, []);
