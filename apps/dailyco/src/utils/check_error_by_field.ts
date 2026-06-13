export const checkErrorByField = <const T extends string>(
    error: unknown,
    field: T
): error is { [key in T]: string } => {
    if (checkErrorByFieldAny(error, field)) {
        return typeof error[field] === 'string';
    }
    return false;
};

const checkErrorByFieldAny = <const T extends string, U extends { [key in T]: any }>(
    error: unknown,
    field: T
): error is U => typeof error === 'object' && !!error && field in error;
