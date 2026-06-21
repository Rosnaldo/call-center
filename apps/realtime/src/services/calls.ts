import { CallState } from "@repo/shared-types";
import { iamApi } from "src/apis/iam";

export const createCall = async (call: CallState): Promise<CallState | null> => {
    try {
        const { data } = await iamApi.post<CallState>('/calls/create', call);
        return data;
    } catch (err) {
        console.error('[IAM] create call failed:', err);
        return null;
    }
};
