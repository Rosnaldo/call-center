import { getUserModel } from "#models/singleton";
import { IUserDao, UserFactoryDao } from "./user_dao";

let UserDao: IUserDao;

export const getUserDao = (): IUserDao => {
    if (!UserDao) {
        UserDao = UserFactoryDao(getUserModel());
    }
    return UserDao;
};
