import { populate } from "#populate";

export const migrate = {
    run: async () => {
        await populate()
    }
}
