export type Document = Record<string, any>;

export type Simple = string | number | boolean;

export type NonFunctionKeys<T> = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

export type NonFunctionProps<T> = Pick<T, NonFunctionKeys<T>>;

export type Equal<T, U> = (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
export type EqualOmit<T, U, O extends string | number | symbol> =
    (<V>() => Omit<V, O> extends Omit<T, O> ? 1 : 2) extends <V>() => Omit<V, O> extends Omit<U, O> ? 1 : 2
        ? true
        : false;

export type Expect<T extends true> = T;

export type Overwrite<T, U> = Omit<T, keyof U> & U;

export type ReplaceId<T> = {
    [K in keyof T]: K extends `id` ? string : T[K];
};

export type ReplaceObjectIdWithString<T> = {
  [K in keyof T]:
    K extends `${string}Id` | '_id'
      ? string | (undefined extends T[K] ? undefined : never)
      : T[K];
};

export type Mapper<T> = {
    [K in keyof T]: 
        T[K] extends object ? Mapper<T[K]>: T[K];
};

export type MakeOptional<T, K extends keyof T> = {
    [P in keyof T as P extends K ? P : never]?: T[P];
} & {
    [P in keyof T as P extends K ? never : P]: T[P];
};

export interface PaginateResponse<T> {
    isError: boolean;
    data: T[];
    message: string;
    status: number;
    pagination: {
        currentPage: number;
        totalPages: number;
        totalRecords: number;
        size: number;
    };
}

export type AssertAllKeysIncluded<T extends Document, K extends ReadonlyArray<keyof T>> =
    Exclude<keyof T, K[number]> extends never ? true : false;

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[] // handle arrays
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
