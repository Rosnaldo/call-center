import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

dotenv.config({
    path: `.env.${process.env.NODE_ENV}`,
    override: true
});

import { IUserAvatar } from '@repo/shared-types';
import { IUser } from "#schemas/user/types";
import { UserBuilder } from '#schemas/user/utils';
import properties from '#properties';
import { joinUrl } from '#utils/join_url';

type UserPick = Pick<IUser['IParams'], 'firstName' | 'lastName' | 'email' | 'role'> & {
    avatar: Pick<IUserAvatar, 's3Path'>;
};

const users: UserPick[] = [
    {
        firstName: "Andrey",
        lastName: "Tsuzuki",
        email: "andreytsuzuki@gmail.com",
        avatar: {
            s3Path: `avatars/${properties.nodeEnv}/andrey.tsuzuki.jpeg`
        },
        role: 'admin',
    },
    {
        firstName: "João",
        lastName: "Atendente",
        email: "attendant@e2e.test",
        avatar: {
            s3Path: `avatars/${properties.nodeEnv}/joao.atendente.jpeg`
        },
        role: 'attendant',
    },
    {
        firstName: "Maria",
        lastName: "Cliente",
        email: "customer@e2e.test",
        avatar: {
            s3Path: `avatars/${properties.nodeEnv}/maria.cliente.jpeg`
        },
        role: 'customer',
    },
];

export const populate = async () => {
    const promises = users.map(async (m) => {
        const builder = new UserBuilder();
        return await builder
            .create({
                firstName: m.firstName,
                lastName: m.lastName,
                email: m.email,
                role: m.role,
            })
            .setAvatar({
                url: joinUrl(properties.s3Host, m.avatar.s3Path),
                s3Path: m.avatar.s3Path,
            }).save();
    });
    await Promise.all(promises);
}
