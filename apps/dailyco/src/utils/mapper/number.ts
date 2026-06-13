import _ from "lodash";

export const mapNumber = (s?: string, defaultNumber?: number): number => {
    if (defaultNumber && _.isNil(s)) return defaultNumber;
    return Number(s);
};
