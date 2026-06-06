import { initializeServices } from "src/initialize_services";
import { populate } from "src/populate";

export const e2e = async () => {
    await populate();
}

void initializeServices({ e2e });
