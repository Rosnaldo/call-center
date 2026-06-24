import { Properties } from '../../../realtime/src/properties';
import { InitializeServices } from '../../../realtime/src/initialize_services';
import { Properties as IamProperties } from '../../../iam/src/properties';
import { ISocketServer } from '../../../realtime/src/websocket/socket';
import iamWebhook from '../../../realtime/src/webhooks/iam';

let realtimeServices: InitializeServices;

export async function startRealtimeServer(wss: ISocketServer): Promise<InitializeServices> {
    const properties = Properties.getInstance();
    realtimeServices = InitializeServices.getInstance(properties);

    await realtimeServices.start();

    realtimeServices.wss = wss;
    iamWebhook(realtimeServices.app, wss);

    const port = realtimeServices.properties.port;
    IamProperties.override({ realtimeUri: `http://localhost:${port}` });

    return realtimeServices;
}

export async function stopRealtimeServer(): Promise<void> {
    await realtimeServices.stop();
    InitializeServices.reset();
}

export function getRealtimeServices(): InitializeServices {
    return realtimeServices;
}
