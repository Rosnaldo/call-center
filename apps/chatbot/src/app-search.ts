import gplay from 'google-play-scraper';
import { isAppId } from './params-machine';

// Google Play has no public search API, so this goes through google-play-scraper,
// which reads Play's web endpoints. It can break when Google changes them; callers
// get an empty, failed result and the client keeps its fixed checklist.

export interface AppSearchResult {
    id: string;
    name: string;
    iconUrl: string;
}

export type SearchApps = (term: string) => Promise<AppSearchResult[]>;

export const MIN_TERM_LENGTH = 2;
export const MAX_TERM_LENGTH = 50;
const MAX_RESULTS = 8;
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Shared by every connection: popular terms repeat a lot, and fewer requests
// make Google less likely to rate-limit or block us.
const cachedPlay = gplay.memoized({ maxAge: CACHE_MAX_AGE_MS, max: 1_000 });

export const normalizeTerm = (term: unknown): string | null => {
    const value = String(term ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    return value.length >= MIN_TERM_LENGTH && value.length <= MAX_TERM_LENGTH ? value : null;
};

export const searchGooglePlay: SearchApps = async (term) => {
    const apps = await cachedPlay.search({ term, num: MAX_RESULTS, lang: 'pt', country: 'br' });
    return apps
        .filter((app) => isAppId(app.appId))
        .map((app) => ({ id: app.appId, name: app.title, iconUrl: app.icon }));
};

export interface AppSearchOutcome {
    term: string;
    apps: AppSearchResult[];
    failed: boolean;
}

// Runs one search at a time per connection. Terms typed while one is running
// replace each other, so only the latest is searched next: a fast typist gets
// at most one request in flight, not one per keystroke.
export class AppSearchQueue {
    private running = false;
    private pending: string | null = null;

    constructor(
        private readonly search: SearchApps,
        private readonly onResult: (outcome: AppSearchOutcome) => void,
    ) {}

    push(term: string): void {
        this.pending = term;
        if (!this.running) void this.drain();
    }

    private async drain(): Promise<void> {
        this.running = true;
        while (this.pending !== null) {
            const term = this.pending;
            this.pending = null;
            try {
                this.onResult({ term, apps: await this.search(term), failed: false });
            } catch (err) {
                console.error(`[app-search] "${term}" failed:`, err instanceof Error ? err.message : err);
                this.onResult({ term, apps: [], failed: true });
            }
        }
        this.running = false;
    }
}
