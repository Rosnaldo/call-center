import { Connection } from "mongoose";
import { MainConnection } from "./main";

const main = new MainConnection();

export const connectMain = async ({ testTransaction = false } = {}): Promise<void> => {
    await main.connect({ testTransaction });
}

export const getMainConnection = (): Connection => {
    return main.get();
}

export const disconnectMain = async (): Promise<void> => {
    await main.disconnect();
}
