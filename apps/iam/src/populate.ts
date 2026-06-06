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
        firstName: "Alex",
        lastName: "Mercer",
        email: "alex.mercer@gmail.com",
        avatar: {
            s3Path: `avatars/${properties.nodeEnv}/alex.mercer.jpeg`
        },
        role: 'attendent',
    },
    {
        firstName: "Marcus",
        lastName: "Vance",
        email: "marcus.vance@exemplo.com",
        avatar: {
            s3Path: `avatars/${properties.nodeEnv}/marcus.vance.jpeg`
        },
        role: 'attendent',
    },
    {
        firstName: "David",
        lastName: "Miller",
        email: "david.miller@exemplo.com",
        avatar: {
            s3Path: `avatars/${properties.nodeEnv}/david.miller.jpeg`
        },
        role: 'attendent',
    },
    {
        firstName: "Samantha",
        lastName: "Cruz",
        email: "samantha.cruz@exemplo.com",
        avatar: {
            s3Path: `avatars/${properties.nodeEnv}/samantha.cruz.jpeg`
        },
        role: 'customer',
    },
    {
        firstName: "Emily",
        lastName: "Blunt",
        email: "emily.blunt@exemplo.com",
        avatar: {
            s3Path: `avatars/${properties.nodeEnv}/emily.blunt.jpeg`
        },
        role: 'customer',
    },
    {
        firstName: "Sophia",
        lastName: "Wang",
        email: "sophia.wang@exemplo.com",
        avatar: {
            s3Path: `avatars/${properties.nodeEnv}/sophia.wang.jpeg`
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
