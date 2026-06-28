import supertest from 'supertest';
import { Properties as IamProperties } from '../../../iam/src/properties';
import { InitializeServices } from '../../../iam/src/initialize_services';
import { Properties as WebProperties } from '../../../web/src/properties';

export type IamAgent = ReturnType<typeof supertest.agent>;

let iamServices: InitializeServices;
let iamAgent: IamAgent;

export async function startIamServer(): Promise<IamAgent> {
    const properties = IamProperties.getInstance();
    iamServices = InitializeServices.getInstance(properties);

    await iamServices.start();

    const port = iamServices.properties.port;
    WebProperties.override({ backendUrl: `http://localhost:${port}` });

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

export function getIamPort(): number | string {
    return iamServices.properties.port;
}
