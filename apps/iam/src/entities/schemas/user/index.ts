import mongoose from 'mongoose';

import { IUser } from './types';
import { IUserAvatar, UserRole, UserRoleAll } from '@repo/shared-types';

const { Schema } = mongoose;

const UserAvatarSchema = new Schema<IUserAvatar>({
    url: { type: String, required: true },
    s3Path: { type: String, required: true },
    s3Host: { type: String, required: true },
    cdnHost: { type: String, required: false },
});

export const UserSchema = new Schema<IUser['ISchema']>(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        slug: { type: String, required: true },
        email: { type: String, require: false },
        phone: { type: String, required: false },
        tokens: { type: Number, required: false },
        role: {
            type: String,
            enum: UserRoleAll,
            default: UserRole.customer,
        },
        avatar: { type: UserAvatarSchema, required: false },
    },
    {
        strict: false,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt',
        }
    }
);

UserSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
    this.setOptions({ returnDocument: 'after', runValidators: true, context: 'query' });
    next();
});
