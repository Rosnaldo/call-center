export const toUndefined = (field: string, s: unknown): string | undefined => {
    if (s === undefined) return undefined;
    if (typeof s === 'string') {
        return s.length > 0 ? s : undefined;
    }
    throw Error(`Unespected type field ${field}`);
};
