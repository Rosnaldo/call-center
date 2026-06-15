const extendsObject = (
    error: Record<string, unknown>,
    extend: Record<string, unknown>
): boolean => {
    return Object.keys(extend).every((key) => {
        const hasKey = key in error;
        if (!hasKey) return false;

        const value = extend[key];
        const isObject =
            typeof value === 'object' && value !== null && !Array.isArray(value);

        if (isObject) {
            const errValue = error[key];
            if (
                typeof errValue === "object" &&
                errValue !== null &&
                !Array.isArray(errValue)
            ) {
                return extendsObject(
                    errValue as Record<string, unknown>,
                    value as Record<string, unknown>
                );
            }
            return false;
        }

        return true;
    });
};



export const checkErrorByExtend = <const T extends Record<string, unknown>, U extends T>(
    error: unknown,
    extend: T
): error is U => {
    const isError = typeof error === 'object' && !!error;
    const isExtend = typeof extend === 'object' && !!extend;
    const bothParams = isError && isExtend;

    if (!bothParams) return false;

    const doesExtend = extendsObject(error as Record<string, unknown>, extend);
    return doesExtend;
};
