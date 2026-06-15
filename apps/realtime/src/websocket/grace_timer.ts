const GRACE_PERIOD_MS = 30_000;

type Callback = () => void;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const graceTimer = {
    has(userId: string): boolean {
        return timers.has(userId);
    },

    start(userId: string, onStart: Callback, onExpire: Callback): void {
        if (timers.has(userId)) return;

        onStart();

        const timer = setTimeout(() => {
            timers.delete(userId);
            onExpire();
        }, GRACE_PERIOD_MS);

        timers.set(userId, timer);
    },

    cancel(userId: string): boolean {
        const timer = timers.get(userId);
        if (!timer) return false;
        clearTimeout(timer);
        timers.delete(userId);
        return true;
    },
};
