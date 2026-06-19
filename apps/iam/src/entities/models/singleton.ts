
import { callCollectionName, migrationCollectionName, userCollectionName } from '#const/collection_name_mapping';
import { getMainConnection } from '#db/singleton';
import { IMigration, MigrationSchema } from '#schemas/migration';

import { UserSchema } from '#schemas/user';
import { IUser } from '#schemas/user/types';
import { CallSchema } from '#schemas/call';
import { ICall } from '#schemas/call/types';

let UserModel: IUser['IModel'];
let MigrationModel: IMigration['IModel'];
let CallModel: ICall['IModel'];

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

export const getCallModel = (): ICall['IModel'] => {
    if (!CallModel) {
        const connection = getMainConnection();
        CallModel = connection.model(
            callCollectionName,
            CallSchema,
            callCollectionName
        ) as ICall['IModel'];
    }
    return CallModel;
};
