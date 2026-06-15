export const nor = (a: boolean, b: boolean): boolean => {
    return !(a || b);
};

export const or = (...values: boolean[]): boolean => {
    return values.some(Boolean);
};

export const nand = (a: boolean, b: boolean): boolean => !(a && b);
