
import { migrationCollectionName, userCollectionName, callHistoryCollectionName, transactionCollectionName } from '#const/collection_name_mapping';
import { getMainConnection } from '#db/singleton';
import { IMigration, MigrationSchema } from '#schemas/migration';

import { UserSchema } from '#schemas/user';
import { IUser } from '#schemas/user/types';
import { ICallHistory, CallHistorySchema } from '#schemas/call_history';
import { ITransaction, TransactionSchema } from '#schemas/transaction';

let UserModel: IUser['IModel'];
let MigrationModel: IMigration['IModel'];
let CallHistoryModel: ICallHistory['IModel'];
let TransactionModel: ITransaction['IModel'];

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

export const getCallHistoryModel = (): ICallHistory['IModel'] => {
    if (!CallHistoryModel) {
        const connection = getMainConnection();
        CallHistoryModel = connection.model(
            callHistoryCollectionName,
            CallHistorySchema,
            callHistoryCollectionName
        ) as ICallHistory['IModel'];
    }
    return CallHistoryModel;
};

export const getTransactionModel = (): ITransaction['IModel'] => {
    if (!TransactionModel) {
        const connection = getMainConnection();
        TransactionModel = connection.model(
            transactionCollectionName,
            TransactionSchema,
            transactionCollectionName
        ) as ITransaction['IModel'];
    }
    return TransactionModel;
};
