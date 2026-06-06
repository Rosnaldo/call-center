
import { migrationCollectionName, userCollectionName } from '#const/collection_name_mapping';
import { getMainConnection } from '#db/singleton';
import { IMigration, MigrationSchema } from '#schemas/migration';

import { UserSchema } from '#schemas/user';
import { IUser } from '#schemas/user/types';

let UserModel: IUser['IModel'];
let MigrationModel: IMigration['IModel'];

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

export const getMigrationModel = (): IMigration['IModel'] => {
    if (!MigrationModel) {
        const connection = getMainConnection();
        MigrationModel = connection.model(
            migrationCollectionName,
            MigrationSchema,
            migrationCollectionName
        ) as IMigration['IModel'];
    }
    return MigrationModel;
};
