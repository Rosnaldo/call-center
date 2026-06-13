export const notNil = <T>(val?: T | undefined | null): val is T => val !== undefined && val !== null;
export const isNil = <T>(val?: T | undefined | null): boolean => val === undefined || val === null;
