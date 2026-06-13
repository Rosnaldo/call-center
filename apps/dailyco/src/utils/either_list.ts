import _ from 'lodash';

export interface IsError {
    isError: true;
    message: string;
    status: number;
}

export type IsSuccess<T> = { isError: false; status: number; message: string; data: T[] };

export const isSuccess = <T>(result: EitherList<T>): result is IsSuccess<T> => !result.isError;

export type EitherList<T> = IsError | IsSuccess<T>;

const isArray = (value: any): boolean => {
    return !_.isNil(value) && Array.isArray(value);
};

export const successData = <T>(data: T[], message: string = 'sucesso'): IsSuccess<T> => {
    return {
        data: (isArray(data) ? data : [] as T[]),
        message,
        status: 200,
        isError: false
    };
};
