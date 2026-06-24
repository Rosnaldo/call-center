import supertest from 'supertest';
import { Properties } from '../../../iam/src/properties';
import { InitializeServices } from '../../../iam/src/initialize_services';

export type IamAgent = ReturnType<typeof supertest.agent>;

let iamServices: InitializeServices;
let iamAgent: IamAgent;

export async function startIamServer(): Promise<IamAgent> {
    const properties = Properties.getInstance();
    iamServices = InitializeServices.getInstance(properties);

    await iamServices.start();

    iamAgent = supertest.agent(iamServices.app);
    return iamAgent;
}

export async function stopIamServer(): Promise<void> {
    await iamServices.stop();
    InitializeServices.reset();
}

export function getIamAgent(): IamAgent {
    return iamAgent;
}
