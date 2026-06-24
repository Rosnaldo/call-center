import { Properties } from '../../../realtime/src/properties';
import { InitializeServices } from '../../../realtime/src/initialize_services';
import { ISocketServer } from '../../../realtime/src/websocket/socket';

let realtimeServices: InitializeServices;

export async function startRealtimeServer(wss: ISocketServer): Promise<InitializeServices> {
    const properties = Properties.getInstance();
    realtimeServices = InitializeServices.getInstance(properties);

    await realtimeServices.start();
    realtimeServices.wss = wss;

    return realtimeServices;
}

export function stopRealtimeServer(): void {
    InitializeServices.reset();
}

export function getRealtimeServices(): InitializeServices {
    return realtimeServices;
}
