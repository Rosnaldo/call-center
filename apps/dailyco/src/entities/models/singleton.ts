
import { userCollectionName } from '#const/collection_name_mapping';
import { getMainConnection } from '#db/singleton';

import { UserSchema } from '#schemas/user';
import { IUser } from '#schemas/user/types';

let UserModel: IUser['IModel'];

export const getUserModel = (): IUser['IModel'] => {
    if (!UserModel) {
        const connection = getMainConnection();
        UserModel = connection.model(
            userCollectionName,
            UserSchema,
            userCollectionName
        ) as IUser['IModel'];
    }
    return UserModel;
};
