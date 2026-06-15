import { Simple } from '#types/index';
import { deduplicate } from '#utils/deduplicate';
import { isNil } from 'lodash';

export const mapArray = <T extends Simple>(arr: T[], defaultArr?: T[]): T[] => {
    if (arr === undefined && defaultArr) {
        return defaultArr;
    }
    if (isNil(arr)) {
        return [];
    }
    return Array.isArray(arr) ? deduplicate(arr) : arr;
};
