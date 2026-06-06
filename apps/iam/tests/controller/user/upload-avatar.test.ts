import { mockUser } from '../../entities/schemas/user/mock';
import { mongooseBootstrap } from 'src/mongoose_bootstrap';
import { disconnectMain } from 'src/db/singleton';
import { IUser } from 'src/entities/schemas/user/types';
import { UserController } from 'src/controllers/user';
import { UserRole } from '@repo/shared-types';
import { isSuccess } from 'src/utils/either';

jest.mock('src/keycloak/singleton', () => ({
    getKcMain: jest.fn().mockReturnValue({
        getKcClientCredentials: jest.fn().mockResolvedValue({
            users: {
                create: jest.fn().mockResolvedValue({}),
                find: jest.fn().mockResolvedValue([{ id: 'mock-kc-user-id' }]),
                del: jest.fn().mockResolvedValue(undefined),
                update: jest.fn().mockResolvedValue(undefined),
            },
        }),
    }),
    buildKcMain: jest.fn().mockResolvedValue({}),
}));

jest.mock('src/helpers/s3', () => ({
    uploadToS3: jest.fn().mockResolvedValue({}),
}));

jest.mock('src/utils/image/compress', () => ({
    compressToTargetSize: jest.fn().mockResolvedValue(Buffer.from('compressed')),
}));

let user: IUser['IParams'];

const fakeBuffer = Buffer.from('fake-image-data');
const fakeMimetype = 'image/jpeg';

beforeAll(async () => {
    await mongooseBootstrap();
    const builder = mockUser();
    user = await builder.save();
}, 300_000);

afterAll(async () => {
    await disconnectMain();
});

describe('Controller > User > UploadAvatar', () => {
    it('succeeds when admin uploads avatar for any user', async () => {
        const adminUser: IUser['IParams'] = { ...user, role: UserRole.admin };
        const controller = new UserController();

        const either = await controller.avatar!.exec({
            userId: user._id,
            buffer: fakeBuffer,
            mimetype: fakeMimetype,
            userSource: adminUser,
        });

        if (isSuccess(either)) {
            expect(either.data).toBeDefined();
            expect(either.data._id).toBe(user._id);
            expect(either.data.avatar).toBeDefined();
            expect(either.data.avatar?.s3Path).toMatch(/^avatars\//);
            expect(either.data.avatar?.url).toBeDefined();
        } else {
            throw new Error('Should not return error');
        }
    });

    it('succeeds when customer uploads their own avatar', async () => {
        const customer: IUser['IParams'] = { ...user, role: UserRole.customer };
        const controller = new UserController();

        const either = await controller.avatar!.exec({
            userId: user._id,
            buffer: fakeBuffer,
            mimetype: fakeMimetype,
            userSource: customer,
        });

        if (isSuccess(either)) {
            expect(either.data).toBeDefined();
            expect(either.data.avatar).toBeDefined();
        } else {
            throw new Error('Should not return error');
        }
    });

    it('returns error when customer tries to upload avatar for another user', async () => {
        const anotherBuilder = mockUser();
        const anotherUser = await anotherBuilder.save();

        const customer: IUser['IParams'] = { ...user, role: UserRole.customer };
        const controller = new UserController();

        const either = await controller.avatar!.exec({
            userId: anotherUser._id,
            buffer: fakeBuffer,
            mimetype: fakeMimetype,
            userSource: customer,
        });

        expect(either.isError).toBe(true);
    });

    it('returns error when userId does not exist', async () => {
        const adminUser: IUser['IParams'] = { ...user, role: UserRole.admin };
        const controller = new UserController();

        const either = await controller.avatar!.exec({
            userId: '000000000000000000000000',
            buffer: fakeBuffer,
            mimetype: fakeMimetype,
            userSource: adminUser,
        });

        expect(either.isError).toBe(true);
    });
});
