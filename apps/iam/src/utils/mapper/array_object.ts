import { Simple } from '#types/index';
import { isNil } from 'lodash';

export const mapArrayObject = <S extends Simple>(arr: Record<string, S>[]): Record<string, S>[] => {
    if (isNil(arr)) {
        return [];
    }
    return Array.isArray(arr) ? arr : [];
};
