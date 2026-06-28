import type { AxiosResponse } from "axios";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { mytoast } from "../components/toast";
import { ApiError } from "../error/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function joinUrl(base: string, path?: string) {
  return base.replace(/\/+$/, '') + '/' + path?.replace(/^\/+/, '');
}

export function handleRequestError(error: any) {
    if (error.response) {
        const message = error.response.data?.message || "API error";
        mytoast.error(message);
        throw new ApiError(message);
    }
    if (error instanceof ApiError) {
        mytoast.error(error.message)
    }
}

export async function myfetch<T>(cb: () => Promise<AxiosResponse<any, any, {}>>): Promise<T> {
    try {
        const res = await cb()

        if (res.data?.isError) {
            throw new ApiError(res.data.message || "request failed");
        }

        const meeting = res.data as T;
        return meeting;
    } catch (error: any) {
        handleRequestError(error);
        throw error;
    }
}
