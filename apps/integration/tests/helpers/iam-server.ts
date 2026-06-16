import express from 'express';
import cors from 'cors';
import supertest from 'supertest';

// Direct relative paths — jest moduleNameMapper resolves internal IAM # aliases
import { mongooseBootstrap } from '../../../iam/src/mongoose_bootstrap';
import { connectRedis, disconnectRedis } from '../../../iam/src/redis/singleton';
import { disconnectMain } from '../../../iam/src/db/singleton';
import { routeBootstrap } from '../../../iam/src/route_bootstrap';

export type IamAgent = ReturnType<typeof supertest.agent>;

let iamAgent: IamAgent;

export async function startIamServer(): Promise<IamAgent> {
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    await mongooseBootstrap();
    await connectRedis();
    await routeBootstrap(app);

    iamAgent = supertest.agent(app);
    return iamAgent;
}

export async function stopIamServer(): Promise<void> {
    await disconnectMain();
    await disconnectRedis();
}

export function getIamAgent(): IamAgent {
    return iamAgent;
}
