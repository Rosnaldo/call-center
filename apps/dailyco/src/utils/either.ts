import _ from 'lodash';

export interface IsError {
    isError: true;
    message: string;
    status: number;
}

export type IsSuccess<T> = { isError: false; status: number; message: string; data: T };

export type Either<T> = IsError | IsSuccess<T>;

export const isSuccess = <T>(result: Either<T>): result is IsSuccess<T> => !result.isError;

export const toResponseData = <T>(data: IsSuccess<T>): T => {
    return data.data;
};

const isObjectWithFields = (value: any): boolean => {
    return typeof value === 'object' && !_.isNil(value) && !Array.isArray(value);;
};

export const successData = <T extends object>(data: T, message: string = 'sucesso'): IsSuccess<T> => {
    if (!isObjectWithFields(data)) throw new Error('data is not an object');

    return {
        data,
        message,
        status: 200,
        isError: false
    };
};
