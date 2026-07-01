import { IUser } from '@repo/shared-types';
import { UserBuilder } from '../../../iam/src/entities/schemas/user/utils';

// Mock token format: "mock:<base64(JSON payload)>"
// The IAM middleware's test bypass parses this format.
function makeMockToken(payload: {
    sub: string;
    email: string;
    given_name: string;
    family_name: string;
}): string {
    return 'mock:' + Buffer.from(JSON.stringify(payload)).toString('base64');
}

export const ADMIN_EMAIL = 'admin@integration.test';
export const CUSTOMER_EMAIL = 'customer@integration.test';
export const ATTENDANT_EMAIL = 'attendant@integration.test';

export const ADMIN_TOKEN = makeMockToken({
    sub: 'admin-kc-sub',
    email: ADMIN_EMAIL,
    given_name: 'Admin',
    family_name: 'Integration',
});

export const CUSTOMER_TOKEN = makeMockToken({
    sub: 'customer-kc-sub',
    email: CUSTOMER_EMAIL,
    given_name: 'Customer',
    family_name: 'Integration',
});

export const ATTENDANT_TOKEN = makeMockToken({
    sub: 'attendant-kc-sub',
    email: ATTENDANT_EMAIL,
    given_name: 'Attendant',
    family_name: 'Integration',
});

export interface MockUsers {
    admin: IUser;
    customer: IUser;
    attendant: IUser;
}

export async function createMockUsers(): Promise<MockUsers> {
    const admin = await new UserBuilder()
        .create({ firstName: 'Admin', lastName: 'Integration', email: ADMIN_EMAIL, role: 'admin' })
        .save();

    const customer = await new UserBuilder()
        .create({ firstName: 'Customer', lastName: 'Integration', email: CUSTOMER_EMAIL, role: 'customer', tokens: 10 })
        .save();

    const attendant = await new UserBuilder()
        .create({ firstName: 'Attendant', lastName: 'Integration', email: ATTENDANT_EMAIL, role: 'attendant' })
        .save();

    return { admin, customer, attendant };
}
