import { describe, expect, it, vi } from 'vitest';
import { AppSearchQueue, normalizeTerm, type AppSearchOutcome } from './app-search';

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (err: Error) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

describe('normalizeTerm', () => {
    it('trims, collapses spaces and lowercases', () => {
        expect(normalizeTerm('  Whats   App ')).toBe('whats app');
    });

    it('rejects terms too short or too long', () => {
        expect(normalizeTerm(' w ')).toBeNull();
        expect(normalizeTerm('x'.repeat(51))).toBeNull();
        expect(normalizeTerm(undefined)).toBeNull();
    });
});

describe('AppSearchQueue', () => {
    it('searches only the latest term typed while a search runs', async () => {
        const first = deferred<never[]>();
        const search = vi.fn((term: string) => (term === 'wh' ? first.promise : Promise.resolve([])));
        const results: AppSearchOutcome[] = [];
        const queue = new AppSearchQueue(search, (outcome) => results.push(outcome));

        queue.push('wh');
        queue.push('wha');
        queue.push('what');
        first.resolve([]);
        await vi.waitFor(() => expect(results).toHaveLength(2));

        expect(search.mock.calls.map(([term]) => term)).toEqual(['wh', 'what']);
        expect(results.map((r) => r.term)).toEqual(['wh', 'what']);
    });

    it('reports a failed search with no apps', async () => {
        const results: AppSearchOutcome[] = [];
        const queue = new AppSearchQueue(() => Promise.reject(new Error('blocked')), (o) => results.push(o));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        queue.push('spotify');
        await vi.waitFor(() => expect(results).toEqual([{ term: 'spotify', apps: [], failed: true }]));
    });
});
