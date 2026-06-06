import { KeycloakMain } from "./main";

let kcMain: KeycloakMain;

export const buildKcMain = async (): Promise<KeycloakMain> => {
    kcMain = await KeycloakMain.construir();
    return kcMain;
}

export const getKcMain = (): KeycloakMain => {
    return kcMain;
}
