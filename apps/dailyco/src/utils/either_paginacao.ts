import { PaginateResponse } from '#types/index';
import { Pagination } from '@repo/shared-types';
import _ from 'lodash';

export interface IsError {
    isError: true;
    message: string;
    status: number;
}

export type IsSuccess<T> = PaginateResponse<T>;

export type EitherPaginacao<T> = IsError | IsSuccess<T>;

export const isSuccess = <T>(result: EitherPaginacao<T>): result is IsSuccess<T> => !result;

export const successData = <T>(data: T[], pagination: Pagination): IsSuccess<T> => {
    return {
        data,
        message: 'success',
        isError: false,
        status: 200,
        pagination
    };
};
