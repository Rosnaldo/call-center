import z from 'zod';
import _ from 'lodash';

import { makeSmallStringSchema, makeStringSchema } from '#utils/zod/valid_small_string';
import { makeEmailSchema } from '#utils/zod/valid_email';

import { IUser } from './types';
import { cleanMongooseObject } from '#entities/utils/clean_mongoose_doc';
import { makeEnumSchema } from '#utils/zod/valid_enum';
import { IUserAvatar, UserRoleAll } from '@repo/shared-types';
import { toSlug } from '#utils/to_slug';
import { getUserModel } from '#models/singleton';
import properties from '#properties';
import { Types } from 'mongoose';
import { makeObjectIdSchema } from 'src/utils/zod/valid_objectid_schema';
import { makePhoneSchema } from 'src/utils/zod/valid_phone';
import { makeDateSchema } from 'src/utils/zod/valid_date';
import { hasNoNilValues } from 'src/utils/has_no_nil_values';
import { notNil } from 'src/utils/not_nil';

export class UserUtils {
    public readonly zodAvatarSchema = z.object({
        _id: makeObjectIdSchema('_id'),
        url: makeStringSchema('url'),
        s3Path: makeStringSchema('s3Path'),
        s3Host: makeStringSchema('s3Host'),
        cdnHost: makeStringSchema('cdnHost').optional(),
    });

    public readonly zodSchema = z.object({
        _id: makeObjectIdSchema('_id'),
        firstName: makeSmallStringSchema('firstName'),
        lastName: makeSmallStringSchema('lastName'),
        slug: makeSmallStringSchema('slug'),
        email: makeEmailSchema().optional(),
        phone: makePhoneSchema().optional(),
        role: makeEnumSchema(UserRoleAll, 'role'),
        avatar: this.zodAvatarSchema.optional(),
        createdAt: makeDateSchema('createdAt'),
        updatedAt: makeDateSchema('updatedAt'),
    });

    public readonly toObject = (User: IUser['IDocument']): IUser['IParams'] => {
        const object = cleanMongooseObject(User);
        return {
            ...object,
            _id: User?._id?.toString(),
        };
    };
}

export type IInitBuilder = {
    _id?: IUser['IParams']['_id'];
    firstName: IUser['IParams']['firstName'];
    lastName: IUser['IParams']['lastName'];
    email?: IUser['IParams']['email'];
    role: IUser['IParams']['role'];
}

export class UserBuilder {
    public readonly utils = new UserUtils();
    protected readonly doc: IUser['IDocument'];

    constructor(doc: IUser['IDocument'] | null = null) {
        const UserModel = getUserModel();
        if (doc != null) this.doc = doc;
        else this.doc = new UserModel();
    }

    public readonly build = (params: Partial<IUser['IParams']>): this => {
        const { firstName, lastName, email, role, avatar } = params;

        const update = { firstName, lastName, email, role };
        if (hasNoNilValues(update)) {
            this.update(update);
        }

        if (avatar) {
            this.setAvatar(avatar);
        }

        return this;
    };

    public readonly create = (params: IInitBuilder): this => {
        const { _id, firstName, lastName, email, role } = params;
        const slug = toSlug(`${firstName}-${lastName}`);

        if (notNil(_id)) {
            this.doc._id = new Types.ObjectId(_id);
        }

        this.doc.firstName = firstName;
        this.doc.lastName = lastName;
        this.doc.slug = slug;
        this.doc.email = email;
        this.doc.role = role;

        return this;
    };

    public readonly update = (params: Partial<IInitBuilder>): this => {
        const { firstName, lastName, email, role } = params;

        this.doc.firstName = (_.isNil(firstName)) ? this.doc.firstName : firstName;
        this.doc.lastName = (_.isNil(lastName)) ? this.doc.lastName : lastName;
        this.doc.email = (_.isNil(email)) ? this.doc.email : email;
        this.doc.role = (_.isNil(role)) ? this.doc.role : role;

        return this;
    };

    public readonly setAvatar = ({ s3Path, url }: Pick<IUserAvatar, 's3Path' | 'url'>): this => {
        this.doc.avatar = {
            _id: new Types.ObjectId().toString(),
            s3Host: properties.s3Host,
            cdnHost: properties.cdnHost,
            s3Path,
            url,
        };
        return this;
    };

    public readonly save = async (): Promise<IUser['IParams']> => {
        await this.doc.save();
        return this.utils.toObject(this.doc);
    };
}
