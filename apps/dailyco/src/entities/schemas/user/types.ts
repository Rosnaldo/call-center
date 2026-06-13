import { Types, HydratedDocument, Model } from 'mongoose';

import { IUserAvatar, IUser as IUserParams } from '@repo/shared-types';
import { Query } from 'mongoose';
import { ReplaceObjectIdWithString } from 'src/types';

export interface IAvatarSchema {
    _id: Types.ObjectId;
    url: string;
    s3Path: string;
    s3Host: string;
    cdnHost?: string;
}

export type IAvatarParams = ReplaceObjectIdWithString<IAvatarSchema>;

export interface IUserSchema {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    slug: string;
    email?: string;
    role: string;
    avatar?: IUserAvatar;
}

type IUserDocument = HydratedDocument<IUserSchema> & { _id: Types.ObjectId } ;

type IUserModel = Model<IUser['ISchema']>;

type IUserQuery = Query<any, any, any, IUser['ISchema']>;

export interface IUser {
    ISchema: IUserSchema;
    IDocument: IUserDocument;
    IParams: IUserParams;
    IModel: IUserModel;
    IQuery: IUserQuery;
}
