import { getCallModel, getMigrationModel, getUserModel } from "#models/singleton";
import { ICallDao, CallFactoryDao } from "./call_dao";
import { IMigrationDao, MigrationFactoryDao } from "./migration_dao";
import { IUserDao, UserFactoryDao } from "./user_dao";

let UserDao: IUserDao;
let MigrationDao: IMigrationDao;
let CallDao: ICallDao;

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

export const getCallDao = (): ICallDao => {
    if (!CallDao) {
        CallDao = CallFactoryDao(getCallModel());
    }
    return CallDao;
};
