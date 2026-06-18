import { getCallModel, getCallUserPresenceModel, getMigrationModel, getUserModel } from "#models/singleton";
import { ICallDao, CallFactoryDao } from "./call_dao";
import { ICallUserPresenceDao, CallUserPresenceFactoryDao } from "./call_user_presence_dao";
import { IMigrationDao, MigrationFactoryDao } from "./migration_dao";
import { IUserDao, UserFactoryDao } from "./user_dao";

let UserDao: IUserDao;
let MigrationDao: IMigrationDao;
let CallDao: ICallDao;
let CallUserPresenceDao: ICallUserPresenceDao;

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

export const getCallUserPresenceDao = (): ICallUserPresenceDao => {
    if (!CallUserPresenceDao) {
        CallUserPresenceDao = CallUserPresenceFactoryDao(getCallUserPresenceModel());
    }
    return CallUserPresenceDao;
};
