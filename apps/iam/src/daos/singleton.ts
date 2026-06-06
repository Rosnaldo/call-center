import { getMigrationModel, getUserModel } from "#models/singleton";
import { IMigrationDao, MigrationFactoryDao } from "./migration_dao";
import { IUserDao, UserFactoryDao } from "./user_dao";

let UserDao: IUserDao;
let MigrationDao: IMigrationDao;

export const getUserDao = (): IUserDao => {
    if (!UserDao) {
        UserDao = UserFactoryDao(getUserModel());
    }
    return UserDao;
};

export const getMigrationDao = (): IMigrationDao => {
    if (!MigrationDao) {
        MigrationDao = MigrationFactoryDao(getMigrationModel());
    }
    return MigrationDao;
};
