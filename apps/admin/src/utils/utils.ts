import { mytoast } from "@/components/toast";
import { ApiError } from "@/error/api";
import type { AxiosResponse } from "axios";

export function handleRequestError(error: any) {
    // Axios errors não são ApiError
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

        const data = res.data as T;
        return data;
    } catch (error: any) {
        handleRequestError(error);
        throw error;
    }
}
